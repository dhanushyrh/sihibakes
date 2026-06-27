"use client";

import type { ActivityEventName, ActivityStage } from "@/lib/customer-activity";

const ANONYMOUS_ID_KEY = "sihi-anonymous-id";
const ACTIVITY_SESSION_KEY = "sihi-activity-session-id";

const CLIENT_EVENTS: ActivityEventName[] = [
  "cart_item_added",
  "phone_verified",
  "location_marked",
  "checkout_started",
];

export function getAnonymousId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANONYMOUS_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function getActivitySessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVITY_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setActivitySessionId(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVITY_SESSION_KEY, sessionId);
  } catch {
    // ignore
  }
}

export function clearActivitySessionId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVITY_SESSION_KEY);
  } catch {
    // ignore
  }
}

export interface TrackActivityPayload {
  phone?: string;
  fullName?: string;
  email?: string;
  lat?: number;
  lng?: number;
  deliveryDistanceKm?: number;
  deliveryFeeInr?: number;
  cartValueInr?: number;
  itemCount?: number;
  productId?: string;
  cartItems?: Array<{
    productId: string;
    quantity: number;
    title?: string;
    unitPriceInr?: number;
    lineTotalInr?: number;
  }>;
  [key: string]: unknown;
}

export function trackActivity(
  eventName: ActivityEventName,
  stage: ActivityStage,
  payload: TrackActivityPayload = {}
) {
  if (typeof window === "undefined") return;
  if (!CLIENT_EVENTS.includes(eventName)) return;

  const anonymousId = getAnonymousId();
  if (!anonymousId) return;

  const sessionId = getActivitySessionId();

  void fetch("/api/activity/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      anonymousId,
      eventName,
      stage,
      phone: payload.phone,
      fullName: payload.fullName,
      email: payload.email,
      lat: payload.lat,
      lng: payload.lng,
      deliveryDistanceKm: payload.deliveryDistanceKm,
      deliveryFeeInr: payload.deliveryFeeInr,
      cartValueInr: payload.cartValueInr,
      cartItems: payload.cartItems,
      payload,
    }),
    keepalive: true,
  })
    .then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { sessionId?: string };
      if (data.sessionId) {
        setActivitySessionId(data.sessionId);
      }
    })
    .catch(() => {
      // fire-and-forget
    });
}

export function getActivitySessionIdForOrder(): string | null {
  return getActivitySessionId();
}
