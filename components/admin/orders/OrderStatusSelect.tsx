"use client";

import { ORDER_STATUS_OPTIONS } from "@/lib/constants";
import { ORDER_STATUS_COLORS } from "@/lib/order-badges";
import type { OrderStatus } from "@/lib/types";

interface OrderStatusSelectProps {
  value: OrderStatus;
  onRequestChange: (status: OrderStatus) => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function OrderStatusSelect({
  value,
  onRequestChange,
  disabled,
  fullWidth,
}: OrderStatusSelectProps) {
  const isCancelled = value === "cancelled";
  const options = ORDER_STATUS_OPTIONS.filter(
    (s) => s.key !== "cancelled" || isCancelled
  );

  return (
    <select
      value={value}
      disabled={disabled || isCancelled}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        if (next !== value) onRequestChange(next);
      }}
      onClick={(e) => e.stopPropagation()}
      className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-medium capitalize disabled:cursor-not-allowed disabled:opacity-60 ${
        ORDER_STATUS_COLORS[value] ?? "bg-gray-100 text-gray-700"
      } ${fullWidth ? "block w-full py-2 text-sm" : "min-w-[8.5rem]"}`}
    >
      {options.map(({ key, label }) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
