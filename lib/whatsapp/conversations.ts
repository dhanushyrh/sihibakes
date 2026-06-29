import type { SupabaseClient } from "@supabase/supabase-js";
import { WHATSAPP_CONVERSATIONS_PAGE_SIZE } from "@/lib/constants";
import type {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from "@/lib/types";
import { normalizeIndianPhone } from "@/lib/whatsapp/phone";

export function waIdToPhone(waId: string): string {
  return normalizeIndianPhone(waId);
}

export function previewForMessage(
  messageType: string,
  body: string | null | undefined
): string {
  if (body?.trim()) return body.trim().slice(0, 160);
  switch (messageType) {
    case "image":
      return "[Image]";
    case "video":
      return "[Video]";
    case "audio":
      return "[Audio]";
    case "document":
      return "[Document]";
    case "sticker":
      return "[Sticker]";
    case "location":
      return "[Location]";
    case "template":
      return "[Template]";
    default:
      return `[${messageType}]`;
  }
}

export async function findCustomerIdByPhone(
  admin: SupabaseClient,
  phone: string
): Promise<string | null> {
  const { data } = await admin
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  return data?.id ?? null;
}

export async function upsertConversation(
  admin: SupabaseClient,
  params: {
    waId: string;
    displayName?: string | null;
    lastCustomerMessageAt?: string | null;
    lastMessageAt?: string | null;
    lastMessagePreview?: string | null;
    incrementUnread?: boolean;
  }
): Promise<{ id: string } | null> {
  const phone = waIdToPhone(params.waId);
  const customerId = await findCustomerIdByPhone(admin, phone);
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("whatsapp_conversations")
    .select("id, unread_count, display_name")
    .eq("wa_id", params.waId)
    .maybeSingle();

  if (existing) {
    const unreadCount =
      (existing.unread_count ?? 0) + (params.incrementUnread ? 1 : 0);
    const { data, error } = await admin
      .from("whatsapp_conversations")
      .update({
        phone,
        customer_id: customerId,
        display_name: params.displayName?.trim() || existing.display_name,
        last_customer_message_at:
          params.lastCustomerMessageAt ?? undefined,
        last_message_at: params.lastMessageAt ?? now,
        last_message_preview: params.lastMessagePreview ?? undefined,
        unread_count: unreadCount,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) {
      console.error("whatsapp_conversations update failed:", error);
      return null;
    }
    return data;
  }

  const { data, error } = await admin
    .from("whatsapp_conversations")
    .insert({
      wa_id: params.waId,
      phone,
      customer_id: customerId,
      display_name: params.displayName?.trim() || null,
      last_customer_message_at: params.lastCustomerMessageAt ?? null,
      last_message_at: params.lastMessageAt ?? now,
      last_message_preview: params.lastMessagePreview ?? null,
      unread_count: params.incrementUnread ? 1 : 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("whatsapp_conversations insert failed:", error);
    return null;
  }
  return data;
}

export async function insertWhatsAppMessage(
  admin: SupabaseClient,
  params: {
    conversationId: string;
    direction: "inbound" | "outbound";
    waMessageId?: string | null;
    messageType: string;
    body?: string | null;
    templateName?: string | null;
    payload?: Record<string, unknown> | null;
    status?: WhatsAppMessageStatus;
    errorMessage?: string | null;
    orderId?: string | null;
    sentAt?: string | null;
    createdAt?: string | null;
  }
): Promise<{ id: string } | null> {
  const { data, error } = await admin
    .from("whatsapp_messages")
    .insert({
      conversation_id: params.conversationId,
      direction: params.direction,
      wa_message_id: params.waMessageId ?? null,
      message_type: params.messageType,
      body: params.body ?? null,
      template_name: params.templateName ?? null,
      payload: params.payload ?? null,
      status: params.status ?? (params.direction === "inbound" ? "received" : "sent"),
      error_message: params.errorMessage ?? null,
      order_id: params.orderId ?? null,
      sent_at: params.sentAt ?? (params.direction === "outbound" ? new Date().toISOString() : null),
      created_at: params.createdAt ?? undefined,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" && params.waMessageId) {
      const { data: existing } = await admin
        .from("whatsapp_messages")
        .select("id")
        .eq("wa_message_id", params.waMessageId)
        .maybeSingle();
      return existing ? { id: existing.id } : null;
    }
    console.error("whatsapp_messages insert failed:", error);
    return null;
  }
  return data;
}

export async function updateMessageStatus(
  admin: SupabaseClient,
  waMessageId: string,
  status: WhatsAppMessageStatus,
  timestamp?: string
): Promise<void> {
  const at = timestamp
    ? new Date(Number(timestamp) * 1000).toISOString()
    : new Date().toISOString();

  const patch: Record<string, string> = { status };
  if (status === "delivered") patch.delivered_at = at;
  if (status === "read") patch.read_at = at;
  if (status === "failed") patch.failed_at = at;
  if (status === "sent") patch.sent_at = at;

  const { error } = await admin
    .from("whatsapp_messages")
    .update(patch)
    .eq("wa_message_id", waMessageId);

  if (error) {
    console.error("whatsapp_messages status update failed:", error);
  }
}

export async function markConversationRead(
  admin: SupabaseClient,
  conversationId: string
): Promise<void> {
  await admin
    .from("whatsapp_conversations")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export type AdminConversationsQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: "open" | "closed" | "all";
};

export async function queryAdminConversations(
  admin: SupabaseClient,
  params: AdminConversationsQuery
): Promise<{
  data: WhatsAppConversation[];
  count: number | null;
  error: Error | null;
}> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? WHATSAPP_CONVERSATIONS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("whatsapp_conversations")
    .select("*, customer:customers(id, name, phone, email, created_at)", {
      count: "exact",
    })
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const q = params.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 4) {
      query = query.or(`phone.ilike.%${digits}%,display_name.ilike.%${q}%`);
    } else {
      query = query.ilike("display_name", `%${q}%`);
    }
  }

  const { data, count, error } = await query.range(from, to);
  return {
    data: (data ?? []) as WhatsAppConversation[],
    count,
    error: error ? new Error(error.message) : null,
  };
}

export async function getConversationById(
  admin: SupabaseClient,
  conversationId: string
): Promise<WhatsAppConversation | null> {
  const { data, error } = await admin
    .from("whatsapp_conversations")
    .select("*, customer:customers(id, name, phone, email, created_at)")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    console.error("getConversationById failed:", error);
    return null;
  }
  return (data as WhatsAppConversation) ?? null;
}

export async function getConversationMessages(
  admin: SupabaseClient,
  conversationId: string,
  limit = 50
): Promise<WhatsAppMessage[]> {
  const { data, error } = await admin
    .from("whatsapp_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("getConversationMessages failed:", error);
    return [];
  }
  return (data ?? []) as WhatsAppMessage[];
}
