"use client";

import { ORDER_STATUS_OPTIONS } from "@/lib/constants";
import { ORDER_STATUS_COLORS } from "@/lib/order-badges";
import { statusChangeLabel } from "@/lib/order-status-update";
import {
  getAllowedNextStatuses,
  isTerminalOrderStatus,
} from "@/lib/order-status-transitions";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

type OrderStatusSelectProps = {
  value: OrderStatus;
  paymentStatus?: PaymentStatus | string;
  onRequestChange: (status: OrderStatus) => void;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function OrderStatusSelect({
  value,
  paymentStatus = "paid",
  onRequestChange,
  disabled,
  fullWidth,
}: OrderStatusSelectProps) {
  const nextStatuses = getAllowedNextStatuses(value, paymentStatus);
  const isTerminal = isTerminalOrderStatus(value);
  const currentLabel =
    ORDER_STATUS_OPTIONS.find((option) => option.key === value)?.label ??
    statusChangeLabel(value);

  return (
    <select
      value={value}
      disabled={disabled || isTerminal || nextStatuses.length === 0}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        if (next !== value) onRequestChange(next);
      }}
      onClick={(e) => e.stopPropagation()}
      className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-medium capitalize disabled:cursor-not-allowed disabled:opacity-60 ${
        ORDER_STATUS_COLORS[value] ?? "bg-gray-100 text-gray-700"
      } ${fullWidth ? "block w-full py-2 text-sm" : "min-w-[8.5rem]"}`}
    >
      <option value={value}>{currentLabel}</option>
      {nextStatuses.map((status) => (
        <option key={status} value={status}>
          → {statusChangeLabel(status)}
        </option>
      ))}
    </select>
  );
}
