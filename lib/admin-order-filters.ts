import type { Order, OrderSource, OrderStatus, PaymentStatus } from "@/lib/types";

export type OrderFilterField = "status" | "payment_status" | "order_source";
export type OrderFilterOp = "eq" | "neq";

export type OrderFieldFilter = {
  field: OrderFilterField;
  op: OrderFilterOp;
  values: string[];
};

const FILTER_FIELD_SET = new Set<OrderFilterField>([
  "status",
  "payment_status",
  "order_source",
]);
const FILTER_OP_SET = new Set<OrderFilterOp>(["eq", "neq"]);

export function serializeOrderFieldFilters(filters: OrderFieldFilter[]): string | undefined {
  const active = filters.filter((f) => f.values.length > 0);
  if (!active.length) return undefined;
  return active
    .map((f) => `${f.field}:${f.op}:${f.values.join(",")}`)
    .join(";");
}

export function parseOrderFieldFilters(raw: string | null | undefined): OrderFieldFilter[] {
  if (!raw?.trim()) return [];

  return raw
    .split(";")
    .map((segment) => {
      const [field, op, valuesRaw] = segment.split(":");
      if (!field || !op || !valuesRaw) return null;
      if (!FILTER_FIELD_SET.has(field as OrderFilterField)) return null;
      if (!FILTER_OP_SET.has(op as OrderFilterOp)) return null;

      const values = valuesRaw.split(",").filter(Boolean);
      if (!values.length) return null;

      return {
        field: field as OrderFilterField,
        op: op as OrderFilterOp,
        values,
      };
    })
    .filter((f): f is OrderFieldFilter => f !== null);
}

/** Backward compat: legacy `status=a,b` means status is a or b. */
export function parseLegacyStatusFilter(
  statusRaw: string | null | undefined
): OrderFieldFilter | null {
  if (!statusRaw?.trim()) return null;
  const values = statusRaw.split(",").filter(Boolean);
  if (!values.length) return null;
  return { field: "status", op: "eq", values };
}

export function orderMatchesFieldFilters(
  order: Pick<Order, "status" | "payment_status" | "order_source">,
  filters: OrderFieldFilter[]
): boolean {
  for (const filter of filters) {
    if (!filter.values.length) continue;

    const value = order[filter.field] ?? (filter.field === "order_source" ? "online" : "");
    const matches = filter.values.includes(value);

    if (filter.op === "eq" && !matches) return false;
    if (filter.op === "neq" && matches) return false;
  }

  return true;
}

export function applyOrderFieldFilters<Q extends { in: Function; not: Function }>(
  query: Q,
  filters: OrderFieldFilter[]
): Q {
  let next = query;

  for (const filter of filters) {
    if (!filter.values.length) continue;

    if (filter.op === "eq") {
      next = next.in(filter.field, filter.values) as Q;
    } else {
      next = next.not(filter.field, "in", `(${filter.values.join(",")})`) as Q;
    }
  }

  return next;
}

export const ORDER_FILTER_FIELD_OPTIONS: {
  key: OrderFilterField;
  label: string;
  values: readonly { key: string; label: string }[];
}[] = [
  {
    key: "status",
    label: "Status",
    values: [
      { key: "pending", label: "Pending" },
      { key: "confirmed", label: "Confirmed" },
      { key: "preparing", label: "Preparing" },
      { key: "out_for_delivery", label: "Out for Delivery" },
      { key: "delivered", label: "Delivered" },
      { key: "self_delivered", label: "Self Delivered" },
      { key: "cancelled", label: "Cancelled" },
    ],
  },
  {
    key: "payment_status",
    label: "Payment status",
    values: [
      { key: "pending", label: "Pending" },
      { key: "paid", label: "Paid" },
      { key: "failed", label: "Failed" },
      { key: "refunded", label: "Refunded" },
    ],
  },
  {
    key: "order_source",
    label: "Source",
    values: [
      { key: "online", label: "Online" },
      { key: "offline", label: "Offline" },
    ],
  },
];

export function filterFieldLabel(field: OrderFilterField): string {
  return ORDER_FILTER_FIELD_OPTIONS.find((o) => o.key === field)?.label ?? field;
}

export function filterValueLabel(field: OrderFilterField, value: string): string {
  const option = ORDER_FILTER_FIELD_OPTIONS.find((o) => o.key === field);
  return option?.values.find((v) => v.key === value)?.label ?? value;
}

export function filterOpLabel(op: OrderFilterOp): string {
  return op === "eq" ? "is" : "is not";
}

export function createEmptyOrderFieldFilter(
  field: OrderFilterField = "status"
): OrderFieldFilter {
  return { field, op: "eq", values: [] };
}

export function isActiveOrderFieldFilter(filter: OrderFieldFilter): boolean {
  return filter.values.length > 0;
}

export type { OrderSource, OrderStatus, PaymentStatus };
