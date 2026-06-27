import { createAdminClient } from "@/lib/supabase/admin";
import {
  cartItemsCount,
  normalizeActivityCartItems,
  type ActivityCartItemSnapshot,
} from "@/lib/activity-cart";
import type { RequestClientInfo } from "@/lib/request-client-info";

export const ACTIVITY_STAGES = [
  "cart",
  "phone_verified",
  "location",
  "checkout",
  "order_created",
  "completed",
] as const;

export type ActivityStage = (typeof ACTIVITY_STAGES)[number];

export const ACTIVITY_EVENTS = [
  "cart_item_added",
  "phone_verified",
  "location_marked",
  "checkout_started",
  "order_created",
  "order_completed",
] as const;

export type ActivityEventName = (typeof ACTIVITY_EVENTS)[number];

const STAGE_RANK: Record<ActivityStage, number> = {
  cart: 0,
  phone_verified: 1,
  location: 2,
  checkout: 3,
  order_created: 4,
  completed: 5,
};

export interface TrackActivityInput {
  sessionId?: string | null;
  anonymousId: string;
  eventName: ActivityEventName;
  stage: ActivityStage;
  phone?: string | null;
  fullName?: string | null;
  email?: string | null;
  customerId?: string | null;
  lat?: number | null;
  lng?: number | null;
  deliveryDistanceKm?: number | null;
  deliveryFeeInr?: number | null;
  cartValueInr?: number | null;
  cartItems?: ActivityCartItemSnapshot[] | null;
  orderId?: string | null;
  clientInfo?: RequestClientInfo | null;
  payload?: Record<string, unknown>;
}

function stageTimestampField(
  stage: ActivityStage
): keyof Pick<
  Record<string, unknown>,
  | "first_cart_at"
  | "phone_verified_at"
  | "location_marked_at"
  | "checkout_started_at"
  | "order_created_at"
  | "order_completed_at"
> | null {
  switch (stage) {
    case "cart":
      return "first_cart_at";
    case "phone_verified":
      return "phone_verified_at";
    case "location":
      return "location_marked_at";
    case "checkout":
      return "checkout_started_at";
    case "order_created":
      return "order_created_at";
    case "completed":
      return "order_completed_at";
    default:
      return null;
  }
}

function shouldAdvanceStage(
  current: ActivityStage,
  incoming: ActivityStage
): boolean {
  return STAGE_RANK[incoming] >= STAGE_RANK[current];
}

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const normalized = phone.replace(/\D/g, "").slice(-10);
  return normalized.length === 10 ? normalized : null;
}

function buildSessionFields(input: TrackActivityInput, now: string) {
  const cartItems = input.cartItems ?? [];
  const hasCartSnapshot = cartItems.length > 0;

  return {
    phone: normalizePhone(input.phone),
    full_name: input.fullName?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    customer_id: input.customerId ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    delivery_distance_km: input.deliveryDistanceKm ?? null,
    delivery_fee_inr: input.deliveryFeeInr ?? null,
    cart_value_inr: input.cartValueInr ?? null,
    order_id: input.orderId ?? null,
    ip_address: input.clientInfo?.ipAddress ?? null,
    ip_hash: input.clientInfo?.ipHash ?? null,
    user_agent: input.clientInfo?.userAgent ?? null,
    device_type: input.clientInfo?.deviceType ?? null,
    browser_name: input.clientInfo?.browserName ?? null,
    os_name: input.clientInfo?.osName ?? null,
    cart_items: hasCartSnapshot ? cartItems : undefined,
    cart_items_count: hasCartSnapshot ? cartItemsCount(cartItems) : undefined,
    cart_snapshot_at: hasCartSnapshot ? now : undefined,
  };
}

async function upsertActivityProfile(input: {
  sessionId: string;
  phone: string;
  fullName?: string | null;
  email?: string | null;
  lat?: number | null;
  lng?: number | null;
  deviceType?: string | null;
  cartItems?: ActivityCartItemSnapshot[];
  cartValueInr?: number | null;
  incrementCompleted?: boolean;
}) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const cartItems = input.cartItems ?? [];

  const { data: existing } = await admin
    .from("customer_activity_profiles")
    .select("*")
    .eq("phone", input.phone)
    .maybeSingle();

  const completedCount =
    (existing?.order_completed_count ?? 0) + (input.incrementCompleted ? 1 : 0);

  await admin.from("customer_activity_profiles").upsert(
    {
      phone: input.phone,
      latest_session_id: input.sessionId ?? existing?.latest_session_id ?? null,
      full_name: input.fullName?.trim() || existing?.full_name || null,
      email: input.email?.trim().toLowerCase() || existing?.email || null,
      last_lat: input.lat ?? existing?.last_lat ?? null,
      last_lng: input.lng ?? existing?.last_lng ?? null,
      last_device_type:
        input.deviceType ?? existing?.last_device_type ?? null,
      last_cart_items:
        cartItems.length > 0 ? cartItems : existing?.last_cart_items ?? [],
      last_cart_value_inr:
        input.cartValueInr ?? existing?.last_cart_value_inr ?? null,
      last_seen_at: now,
      order_completed_count: completedCount,
      updated_at: now,
    },
    { onConflict: "phone" }
  );
}

export async function trackActivityEvent(
  input: TrackActivityInput
): Promise<{ sessionId: string } | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const sessionFields = buildSessionFields(input, now);

  let sessionId = input.sessionId ?? null;

  if (sessionId) {
    const { data: existing } = await admin
      .from("customer_activity_sessions")
      .select("id, anonymous_id, last_stage")
      .eq("id", sessionId)
      .maybeSingle();

    if (!existing || existing.anonymous_id !== input.anonymousId) {
      sessionId = null;
    }
  }

  if (!sessionId) {
    const cartItems = input.cartItems ?? [];
    const hasCartSnapshot = cartItems.length > 0;

    const { data: created, error: createError } = await admin
      .from("customer_activity_sessions")
      .insert({
        anonymous_id: input.anonymousId,
        last_stage: input.stage,
        first_cart_at: input.stage === "cart" ? now : null,
        is_order_completed: input.stage === "completed",
        order_completed_at: input.stage === "completed" ? now : null,
        metadata: input.payload ?? {},
        cart_items: hasCartSnapshot ? cartItems : [],
        cart_items_count: hasCartSnapshot ? cartItemsCount(cartItems) : 0,
        cart_snapshot_at: hasCartSnapshot ? now : null,
        phone: sessionFields.phone,
        full_name: sessionFields.full_name,
        email: sessionFields.email,
        customer_id: sessionFields.customer_id,
        lat: sessionFields.lat,
        lng: sessionFields.lng,
        delivery_distance_km: sessionFields.delivery_distance_km,
        delivery_fee_inr: sessionFields.delivery_fee_inr,
        cart_value_inr: sessionFields.cart_value_inr,
        order_id: sessionFields.order_id,
        ip_address: sessionFields.ip_address,
        ip_hash: sessionFields.ip_hash,
        user_agent: sessionFields.user_agent,
        device_type: sessionFields.device_type,
        browser_name: sessionFields.browser_name,
        os_name: sessionFields.os_name,
      })
      .select("id")
      .single();

    if (createError || !created) {
      console.error("Activity session create failed:", createError);
      return null;
    }

    sessionId = created.id;
  } else {
    const { data: existing } = await admin
      .from("customer_activity_sessions")
      .select("last_stage, metadata")
      .eq("id", sessionId)
      .single();

    const currentStage = (existing?.last_stage ?? "cart") as ActivityStage;
    const nextStage = shouldAdvanceStage(currentStage, input.stage)
      ? input.stage
      : currentStage;

    const updates: Record<string, unknown> = {
      updated_at: now,
      last_stage: nextStage,
    };

    const tsField = stageTimestampField(input.stage);
    if (tsField) {
      const { data: timestamps } = await admin
        .from("customer_activity_sessions")
        .select(
          "first_cart_at, phone_verified_at, location_marked_at, checkout_started_at, order_created_at, order_completed_at"
        )
        .eq("id", sessionId)
        .single();

      const currentTs = timestamps?.[tsField as keyof typeof timestamps];
      if (!currentTs) {
        updates[tsField] = now;
      }
    }

    if (sessionFields.phone) updates.phone = sessionFields.phone;
    if (sessionFields.full_name) updates.full_name = sessionFields.full_name;
    if (sessionFields.email) updates.email = sessionFields.email;
    if (sessionFields.customer_id) updates.customer_id = sessionFields.customer_id;
    if (sessionFields.lat != null) updates.lat = sessionFields.lat;
    if (sessionFields.lng != null) updates.lng = sessionFields.lng;
    if (sessionFields.delivery_distance_km != null) {
      updates.delivery_distance_km = sessionFields.delivery_distance_km;
    }
    if (sessionFields.delivery_fee_inr != null) {
      updates.delivery_fee_inr = sessionFields.delivery_fee_inr;
    }
    if (sessionFields.cart_value_inr != null) {
      updates.cart_value_inr = sessionFields.cart_value_inr;
    }
    if (sessionFields.order_id) updates.order_id = sessionFields.order_id;

    if (input.clientInfo) {
      if (sessionFields.ip_address) updates.ip_address = sessionFields.ip_address;
      if (sessionFields.ip_hash) updates.ip_hash = sessionFields.ip_hash;
      if (sessionFields.user_agent) updates.user_agent = sessionFields.user_agent;
      if (sessionFields.device_type) updates.device_type = sessionFields.device_type;
      if (sessionFields.browser_name) updates.browser_name = sessionFields.browser_name;
      if (sessionFields.os_name) updates.os_name = sessionFields.os_name;
    }

    if (sessionFields.cart_items) {
      updates.cart_items = sessionFields.cart_items;
      updates.cart_items_count = sessionFields.cart_items_count;
      updates.cart_snapshot_at = sessionFields.cart_snapshot_at;
    }

    if (input.stage === "completed") {
      updates.is_order_completed = true;
      updates.order_completed_at = now;
    }

    if (input.payload && Object.keys(input.payload).length > 0) {
      updates.metadata = {
        ...((existing?.metadata as Record<string, unknown>) ?? {}),
        ...input.payload,
      };
    }

    const { error: updateError } = await admin
      .from("customer_activity_sessions")
      .update(updates)
      .eq("id", sessionId);

    if (updateError) {
      console.error("Activity session update failed:", updateError);
      return null;
    }
  }

  const eventPayload = {
    ...(input.payload ?? {}),
    ...(input.cartItems?.length
      ? { cart_items: input.cartItems, cart_value_inr: input.cartValueInr ?? null }
      : {}),
  };

  const { error: eventError } = await admin.from("customer_activity_events").insert({
    session_id: sessionId,
    event_name: input.eventName,
    stage: input.stage,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    payload: eventPayload,
  });

  if (eventError) {
    console.error("Activity event insert failed:", eventError);
  }

  const phone = normalizePhone(input.phone);
  if (phone && sessionId) {
    await upsertActivityProfile({
      sessionId,
      phone,
      fullName: input.fullName,
      email: input.email,
      lat: input.lat,
      lng: input.lng,
      deviceType: input.clientInfo?.deviceType ?? null,
      cartItems: input.cartItems ?? undefined,
      cartValueInr: input.cartValueInr,
    });
  }

  if (!sessionId) return null;

  return { sessionId };
}

export async function markActivityOrderCreated(input: {
  activitySessionId?: string | null;
  orderId: string;
  phone: string;
  fullName?: string | null;
  email?: string | null;
  customerId?: string | null;
  lat?: number | null;
  lng?: number | null;
  deliveryDistanceKm?: number | null;
  deliveryFeeInr?: number | null;
  totalInr?: number | null;
  cartItems?: ActivityCartItemSnapshot[] | null;
  clientInfo?: RequestClientInfo | null;
}): Promise<void> {
  if (!input.activitySessionId) return;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const phone = normalizePhone(input.phone);
  const cartItems = input.cartItems ?? [];

  const { data: existing } = await admin
    .from("customer_activity_sessions")
    .select("last_stage, metadata")
    .eq("id", input.activitySessionId)
    .maybeSingle();

  if (!existing) return;

  const currentStage = (existing.last_stage ?? "cart") as ActivityStage;
  const nextStage = shouldAdvanceStage(currentStage, "order_created")
    ? "order_created"
    : currentStage;

  const updatePayload: Record<string, unknown> = {
    updated_at: now,
    last_stage: nextStage,
    order_created_at: now,
    order_id: input.orderId,
    phone,
    full_name: input.fullName?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    customer_id: input.customerId ?? null,
    lat: input.lat ?? undefined,
    lng: input.lng ?? undefined,
    delivery_distance_km: input.deliveryDistanceKm ?? undefined,
    delivery_fee_inr: input.deliveryFeeInr ?? undefined,
    cart_value_inr: input.totalInr ?? undefined,
    metadata: {
      ...((existing.metadata as Record<string, unknown>) ?? {}),
      order_total_inr: input.totalInr ?? null,
    },
  };

  if (cartItems.length > 0) {
    updatePayload.cart_items = cartItems;
    updatePayload.cart_items_count = cartItemsCount(cartItems);
    updatePayload.cart_snapshot_at = now;
  }

  if (input.clientInfo) {
    updatePayload.ip_address = input.clientInfo.ipAddress;
    updatePayload.ip_hash = input.clientInfo.ipHash;
    updatePayload.user_agent = input.clientInfo.userAgent;
    updatePayload.device_type = input.clientInfo.deviceType;
    updatePayload.browser_name = input.clientInfo.browserName;
    updatePayload.os_name = input.clientInfo.osName;
  }

  await admin
    .from("customer_activity_sessions")
    .update(updatePayload)
    .eq("id", input.activitySessionId);

  await admin.from("customer_activity_events").insert({
    session_id: input.activitySessionId,
    event_name: "order_created",
    stage: "order_created",
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    payload: {
      order_id: input.orderId,
      total_inr: input.totalInr ?? null,
      cart_items: cartItems,
    },
  });

  if (phone) {
    await upsertActivityProfile({
      sessionId: input.activitySessionId,
      phone,
      fullName: input.fullName,
      email: input.email,
      lat: input.lat,
      lng: input.lng,
      deviceType: input.clientInfo?.deviceType ?? null,
      cartItems,
      cartValueInr: input.totalInr,
    });
  }
}

export async function markActivityOrderCompleted(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: session } = await admin
    .from("customer_activity_sessions")
    .select("id, phone, is_order_completed")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!session || session.is_order_completed) return;

  await admin
    .from("customer_activity_sessions")
    .update({
      updated_at: now,
      last_stage: "completed",
      is_order_completed: true,
      order_completed_at: now,
    })
    .eq("id", session.id);

  await admin.from("customer_activity_events").insert({
    session_id: session.id,
    event_name: "order_completed",
    stage: "completed",
    payload: { order_id: orderId },
  });

  const phone = normalizePhone(session.phone);
  if (phone) {
    await upsertActivityProfile({
      sessionId: session.id,
      phone,
      incrementCompleted: true,
    });
  }
}

export { normalizeActivityCartItems };
