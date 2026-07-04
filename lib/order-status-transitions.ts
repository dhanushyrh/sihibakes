import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { statusChangeLabel } from "@/lib/order-status-update";

/** Forward-only transitions allowed in admin. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing"],
  preparing: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  self_delivered: [],
  cancelled: [],
};

export const FULFILLMENT_PIPELINE: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
] as const;

const TERMINAL_STATUSES = new Set<OrderStatus>([
  "delivered",
  "self_delivered",
  "cancelled",
]);

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function getAllowedNextStatuses(
  current: OrderStatus,
  paymentStatus: PaymentStatus | string
): OrderStatus[] {
  if (isTerminalOrderStatus(current)) return [];

  const next = [...(ALLOWED_TRANSITIONS[current] ?? [])];

  if (current === "pending" && paymentStatus !== "paid") {
    return next.filter((status) => status !== "confirmed");
  }

  return next;
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
  paymentStatus: PaymentStatus | string
): { ok: true } | { ok: false; error: string } {
  if (from === to) {
    return { ok: false, error: "Status is already set" };
  }

  if (isTerminalOrderStatus(from)) {
    return {
      ok: false,
      error: `Orders marked ${statusChangeLabel(from).toLowerCase()} cannot be changed`,
    };
  }

  const allowed = getAllowedNextStatuses(from, paymentStatus);
  if (!allowed.includes(to)) {
    const fromLabel = statusChangeLabel(from).toLowerCase();
    const toLabel = statusChangeLabel(to).toLowerCase();

    if (from === "pending" && to === "confirmed" && paymentStatus !== "paid") {
      return {
        ok: false,
        error: "Payment must be received before confirming the order",
      };
    }

    return {
      ok: false,
      error: `Cannot move from ${fromLabel} to ${toLabel}`,
    };
  }

  return { ok: true };
}

export function canCancelOrderStatus(status: OrderStatus): boolean {
  return status === "pending";
}
