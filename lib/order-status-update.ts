import type { OrderStatus } from "@/lib/types";

export interface DeliveryDispatchDetails {
  delivery_partner_order_id: string;
  delivery_vendor: string;
  delivery_otp: string;
  delivery_partner_name: string;
}

export interface OrderStatusUpdatePayload {
  status: OrderStatus;
  delivery?: DeliveryDispatchDetails;
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
