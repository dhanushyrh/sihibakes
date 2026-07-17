import type { PaymentMode } from "@/lib/types";

export const PAYMENT_MODE_OPTIONS: {
  key: PaymentMode;
  label: string;
}[] = [
  { key: "cash", label: "Cash" },
  { key: "upi", label: "UPI" },
  { key: "bank_transfer", label: "Bank transfer" },
  { key: "other", label: "Other" },
];

export const PAYMENT_MODE_SET = new Set<PaymentMode>(
  PAYMENT_MODE_OPTIONS.map((o) => o.key)
);

export function formatPaymentMode(mode: PaymentMode | string | null | undefined): string {
  if (!mode) return "—";
  return PAYMENT_MODE_OPTIONS.find((o) => o.key === mode)?.label ?? mode;
}

export function isOfflineOrderSource(
  source: string | null | undefined
): boolean {
  return source === "offline";
}

/** Supabase filter: paid/refunded online orders, or any offline order. */
export const ADMIN_ORDERS_VISIBLE_OR =
  "payment_status.in.(paid,refunded),order_source.eq.offline";

/** Supabase filter: kitchen board includes paid orders and all offline orders. */
export const KITCHEN_ORDERS_VISIBLE_OR =
  "payment_status.eq.paid,order_source.eq.offline";
