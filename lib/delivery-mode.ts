import { orderShortId } from "@/lib/order-badges";
import { isSelfDeliveryOrder, SELF_DELIVERY_VENDOR } from "@/lib/order-status-update";
import type { Order } from "@/lib/types";

export const DELIVERY_MODE_STORAGE_KEY = "sihi-admin-delivery-mode";

export { SELF_DELIVERY_VENDOR };

export function isDeliveryModeOrder(
  order: Pick<Order, "status" | "delivery_vendor">
): boolean {
  return order.status === "out_for_delivery" && isSelfDeliveryOrder(order);
}

export function readDeliveryModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DELIVERY_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDeliveryModeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(DELIVERY_MODE_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(DELIVERY_MODE_STORAGE_KEY);
    }
    window.dispatchEvent(
      new CustomEvent("sihi-delivery-mode-change", { detail: { enabled } })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function formatDeliveryStopAddress(
  order: Pick<Order, "house" | "street" | "landmark" | "pincode">
): string {
  return [order.house, order.street, order.landmark, order.pincode]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

export function deliveryStopMapsHref(
  order: Pick<
    Order,
    "house" | "street" | "landmark" | "pincode" | "delivery_lat" | "delivery_lng"
  >
): string {
  if (order.delivery_lat != null && order.delivery_lng != null) {
    return `https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`;
  }
  const address = formatDeliveryStopAddress(order);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function deliveryStopWhatsAppMessage(
  order: Pick<Order, "customer_name" | "order_number">
): string {
  const shortId = orderShortId(order.order_number);
  return `Hi ${order.customer_name}, I'm outside with your Sihi Bakes order #${shortId}`;
}

export const DELIVERY_MODE_POLL_MS = 25_000;
