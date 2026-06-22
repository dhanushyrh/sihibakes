import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-amber-100 text-amber-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  delivered: "bg-emerald-100 text-emerald-800",
  self_delivered: "bg-teal-100 text-teal-800",
  cancelled: "bg-red-100 text-red-700",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-teal-100 text-teal-800",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-violet-100 text-violet-800",
};

export function formatOrderStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function formatPaymentStatus(status: PaymentStatus | string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  };
  return labels[status] ?? status;
}

/** Last 4-digit segment from order number, e.g. SIHI-20260620-0001 → 0001 */
export function orderShortId(orderNumber: string): string {
  const segment = orderNumber.split("-").pop();
  if (segment && /^\d{4}$/.test(segment)) return segment;
  const digits = orderNumber.replace(/\D/g, "");
  return digits.slice(-4).padStart(4, "0");
}
