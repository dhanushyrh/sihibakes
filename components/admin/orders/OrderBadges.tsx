"use client";

import type { OrderStatus, PaymentStatus } from "@/lib/types";
import {
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  formatOrderStatus,
  formatPaymentStatus,
} from "@/lib/order-badges";
import { isOfflineOrderSource } from "@/lib/offline-orders";

export function OrderStatusBadge({
  status,
  size = "sm",
}: {
  status: OrderStatus | string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium capitalize ${
        ORDER_STATUS_COLORS[status as OrderStatus] ?? "bg-gray-100 text-gray-700"
      } ${size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"}`}
    >
      {formatOrderStatus(status)}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  size = "sm",
}: {
  status: PaymentStatus | string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        PAYMENT_STATUS_COLORS[status as PaymentStatus] ??
        "bg-gray-100 text-gray-700"
      } ${size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"}`}
    >
      {formatPaymentStatus(status)}
    </span>
  );
}

export function OfflineOrderBadge({
  size = "sm",
}: {
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#4B2C20]/10 font-medium text-[#4B2C20] ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      Offline
    </span>
  );
}

export function UnpaidOfflineBadge({
  size = "sm",
}: {
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-amber-100 font-medium text-amber-800 ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      Unpaid
    </span>
  );
}

export function OrderSourceBadges({
  orderSource,
  paymentStatus,
  size = "sm",
}: {
  orderSource?: string | null;
  paymentStatus?: PaymentStatus | string;
  size?: "sm" | "md";
}) {
  if (!isOfflineOrderSource(orderSource)) return null;
  return (
    <>
      <OfflineOrderBadge size={size} />
      {paymentStatus === "pending" ? <UnpaidOfflineBadge size={size} /> : null}
    </>
  );
}
