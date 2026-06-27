import type { DeliveryMode } from "@/lib/customer-delivery-slots";
import type { DeliveryCalculation } from "@/lib/types";

export const DELIVERY_SESSION_KEY = "sihi-delivery-session";

export type DeliverySession = {
  lat: number | null;
  lng: number | null;
  delivery: DeliveryCalculation | null;
  deliveryMode: DeliveryMode | null;
  deliveryDate: string;
  house: string;
  street: string;
  landmark: string;
  pincode: string;
  customerName: string;
  email: string;
  /** @deprecated Use whatsappPhone — kept for older saved sessions */
  phone?: string;
  whatsappPhone: string;
  altPhone: string;
  phoneVerified: boolean;
};

export const EMPTY_DELIVERY_SESSION: DeliverySession = {
  lat: null,
  lng: null,
  delivery: null,
  deliveryMode: null,
  deliveryDate: "",
  house: "",
  street: "",
  landmark: "",
  pincode: "",
  customerName: "",
  email: "",
  whatsappPhone: "",
  altPhone: "",
  phoneVerified: false,
};

export function isDeliveryModeReady(session: DeliverySession): boolean {
  return session.deliveryMode != null && Boolean(session.deliveryDate);
}

function hydrateDeliverySession(
  parsed: Partial<DeliverySession>
): DeliverySession {
  const whatsappPhone = parsed.whatsappPhone ?? parsed.phone ?? "";
  return {
    ...EMPTY_DELIVERY_SESSION,
    ...parsed,
    whatsappPhone,
    email: parsed.email ?? "",
    altPhone: parsed.altPhone ?? "",
    deliveryMode: parsed.deliveryMode ?? null,
    deliveryDate: parsed.deliveryDate ?? "",
  };
}

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
    return hydrateDeliverySession(JSON.parse(raw));
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
