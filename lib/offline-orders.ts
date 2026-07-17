import type { PaymentMode } from "@/lib/types";

export const PAYMENT_MODE_OPTIONS: {
  key: PaymentMode;
  label: string;
}[] = [
  { key: "cash", label: "Cash" },
  { key: "upi", label: "UPI" },
  { key: "bank_transfer", label: "Bank transfer" },
  { key: "barter_collab", label: "Barter collab" },
  { key: "other", label: "Other" },
];

export const PAYMENT_MODE_SET = new Set<PaymentMode>(
  PAYMENT_MODE_OPTIONS.map((o) => o.key)
);

/** Default window when admin creates an offline order without a slot. */
export const OFFLINE_NO_SLOT_WINDOW = {
  start: "10:00:00",
  end: "20:00:00",
} as const;

export function formatPaymentMode(mode: PaymentMode | string | null | undefined): string {
  if (!mode) return "—";
  return PAYMENT_MODE_OPTIONS.find((o) => o.key === mode)?.label ?? mode;
}

export function isOfflineOrderSource(
  source: string | null | undefined
): boolean {
  return source === "offline";
}

export function isBarterCollabMode(
  mode: PaymentMode | string | null | undefined
): boolean {
  return mode === "barter_collab";
}

function normalizeTimeInput(value: string, fallback: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

/** Resolve delivery date + window for offline create (slot optional). */
export function resolveOfflineDeliverySchedule(input: {
  delivery_slot_id?: string | null;
  delivery_date?: string | null;
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  slot?: {
    id: string;
    slot_date: string;
    window_start: string;
    window_end: string;
  } | null;
}):
  | {
      ok: true;
      delivery_date: string;
      delivery_window_start: string;
      delivery_window_end: string;
      delivery_slot_id: string | null;
    }
  | { ok: false; error: string } {
  if (input.slot) {
    return {
      ok: true,
      delivery_date: input.slot.slot_date,
      delivery_window_start: input.slot.window_start,
      delivery_window_end: input.slot.window_end,
      delivery_slot_id: input.slot.id,
    };
  }

  const date = String(input.delivery_date ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Select a delivery date" };
  }

  const start = normalizeTimeInput(
    String(input.delivery_window_start ?? ""),
    OFFLINE_NO_SLOT_WINDOW.start
  );
  const end = normalizeTimeInput(
    String(input.delivery_window_end ?? ""),
    OFFLINE_NO_SLOT_WINDOW.end
  );

  if (!start || !end) {
    return { ok: false, error: "Enter a valid delivery time window (HH:MM)" };
  }

  if (start >= end) {
    return { ok: false, error: "Window end must be after start" };
  }

  return {
    ok: true,
    delivery_date: date,
    delivery_window_start: start,
    delivery_window_end: end,
    delivery_slot_id: null,
  };
}

/** Supabase filter: paid/refunded online orders, or any offline order. */
export const ADMIN_ORDERS_VISIBLE_OR =
  "payment_status.in.(paid,refunded),order_source.eq.offline";

/** Supabase filter: kitchen board includes paid orders and all offline orders. */
export const KITCHEN_ORDERS_VISIBLE_OR =
  "payment_status.eq.paid,order_source.eq.offline";
