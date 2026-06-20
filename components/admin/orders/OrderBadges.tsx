"use client";

import type { OrderStatus, PaymentStatus } from "@/lib/types";
import {
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  formatOrderStatus,
  formatPaymentStatus,
} from "@/lib/order-badges";

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
