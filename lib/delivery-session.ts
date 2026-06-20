import type { DeliveryCalculation } from "@/lib/types";

export const DELIVERY_SESSION_KEY = "sihi-delivery-session";

export type DeliverySession = {
  lat: number | null;
  lng: number | null;
  delivery: DeliveryCalculation | null;
  house: string;
  street: string;
  landmark: string;
  pincode: string;
  customerName: string;
  phone: string;
  phoneVerified: boolean;
};

export const EMPTY_DELIVERY_SESSION: DeliverySession = {
  lat: null,
  lng: null,
  delivery: null,
  house: "",
  street: "",
  landmark: "",
  pincode: "",
  customerName: "",
  phone: "",
  phoneVerified: false,
};

export function isDeliveryLocationReady(session: DeliverySession): boolean {
  return (
    session.lat != null &&
    session.lng != null &&
    session.delivery?.reachable === true
  );
}

export function formatDeliveryAddress(session: DeliverySession): string {
  const parts = [
    session.house,
    session.street,
    session.landmark,
    session.pincode,
  ].filter(Boolean);
  return parts.join(", ");
}

export function readDeliverySession(): DeliverySession {
  if (typeof window === "undefined") return EMPTY_DELIVERY_SESSION;
  try {
    const raw = localStorage.getItem(DELIVERY_SESSION_KEY);
    if (!raw) return EMPTY_DELIVERY_SESSION;
    return { ...EMPTY_DELIVERY_SESSION, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DELIVERY_SESSION;
  }
}

export function writeDeliverySession(session: DeliverySession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DELIVERY_SESSION_KEY, JSON.stringify(session));
}

export function clearDeliverySession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DELIVERY_SESSION_KEY);
}
