import type { Order, OrderStatus } from "@/lib/types";
import { BORZO_VENDOR_NAME } from "@/lib/borzo/config";
import { isBorzoVendorName } from "@/lib/borzo/delivery";

export const SELF_DELIVERY_VENDOR = "Self delivery";
export { BORZO_VENDOR_NAME };

export type DeliveryDispatchMode = "partner" | "self";

export interface DeliveryDispatchDetails {
  delivery_partner_order_id: string;
  delivery_vendor: string;
  delivery_otp: string;
  delivery_partner_name: string;
}

export interface DeliveryEtaInput {
  date: string;
  window_start: string;
  window_end: string;
}

export interface OrderStatusUpdatePayload {
  status: OrderStatus;
  dispatchMode?: DeliveryDispatchMode;
  delivery?: DeliveryDispatchDetails;
  deliveryEta?: DeliveryEtaInput;
}

export function statusChangeLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    preparing: "Preparing",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    self_delivered: "Self Delivered",
    cancelled: "Cancelled",
  };
  return labels[status];
}

export function requiresDeliveryDispatch(status: OrderStatus): boolean {
  return status === "out_for_delivery";
}

export function isSelfDeliveryOrder(
  order: Pick<Order, "delivery_vendor">
): boolean {
  return order.delivery_vendor?.trim() === SELF_DELIVERY_VENDOR;
}

export function requiresPartnerDispatchDetails(
  status: OrderStatus,
  dispatchMode: DeliveryDispatchMode = "partner"
): boolean {
  return requiresDeliveryDispatch(status) && dispatchMode === "partner";
}

export function requiresBorzoAutoDispatch(
  status: OrderStatus,
  dispatchMode: DeliveryDispatchMode = "partner",
  vendor?: string
): boolean {
  return (
    requiresDeliveryDispatch(status) &&
    dispatchMode === "partner" &&
    Boolean(vendor && isBorzoVendorName(vendor))
  );
}
