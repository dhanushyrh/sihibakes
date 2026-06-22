import { format, parseISO } from "date-fns";
import type { Order, OrderItem, Product } from "@/lib/types";

export type RosterGroupMode = "slot" | "day";

export const ROSTER_HEADERS = [
  "Order #",
  "Customer",
  "WhatsApp",
  "Alt. Phone",
  "Address",
  "Items",
  "Status",
  "Delivery Window",
  "Subtotal",
  "Delivery Fee",
  "Total",
  "Placed At",
] as const;

export type RosterOrder = Order & {
  order_items: (OrderItem & { products?: Product | null })[];
};

export function formatDeliveryWindow(start: string, end: string): string {
  return `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
}

export function formatOrderAddress(order: Order): string {
  return [order.house, order.street, order.landmark, order.pincode]
    .filter(Boolean)
    .join(", ");
}

export function orderItemTitle(
  item: Pick<OrderItem, "products" | "product">
): string {
  return item.products?.title ?? item.product?.title ?? "Product";
}

export function formatOrderItems(
  items: (OrderItem & { products?: Product | null })[]
): string {
  return items
    .map((item) => `${item.quantity}× ${orderItemTitle(item)}`)
    .join(", ");
}

export function orderToRosterRow(order: RosterOrder): (string | number)[] {
  const window =
    order.delivery_window_start && order.delivery_window_end
      ? formatDeliveryWindow(
          order.delivery_window_start,
          order.delivery_window_end
        )
      : "";

  return [
    order.order_number,
    order.customer_name,
    order.phone,
    order.alt_phone || "",
    formatOrderAddress(order),
    formatOrderItems(order.order_items ?? []),
    order.status,
    window,
    order.subtotal_inr,
    order.delivery_fee_inr,
    order.total_inr,
    format(parseISO(order.created_at), "d MMM yyyy, h:mm a"),
  ];
}

export function slotSheetName(start: string, end: string): string {
  return sanitizeSheetName(formatDeliveryWindow(start, end));
}

export function daySheetName(date: string): string {
  return sanitizeSheetName(format(parseISO(date), "EEE d MMM"));
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, "-").slice(0, 31);
}

export function groupOrdersBySlot(
  orders: RosterOrder[]
): Map<string, RosterOrder[]> {
  const groups = new Map<string, RosterOrder[]>();

  for (const order of orders) {
    const key = `${order.delivery_window_start}|${order.delivery_window_end}`;
    const list = groups.get(key) ?? [];
    list.push(order);
    groups.set(key, list);
  }

  return new Map(
    [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  );
}

export function groupOrdersByDay(
  orders: RosterOrder[]
): Map<string, RosterOrder[]> {
  const groups = new Map<string, RosterOrder[]>();

  for (const order of orders) {
    const list = groups.get(order.delivery_date) ?? [];
    list.push(order);
    groups.set(order.delivery_date, list);
  }

  for (const [date, list] of groups) {
    list.sort((a, b) => {
      const slotCmp = a.delivery_window_start.localeCompare(
        b.delivery_window_start
      );
      if (slotCmp !== 0) return slotCmp;
      return a.created_at.localeCompare(b.created_at);
    });
    groups.set(date, list);
  }

  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function buildSheetRows(orders: RosterOrder[]): (string | number)[][] {
  return [ROSTER_HEADERS.slice(), ...orders.map(orderToRosterRow)];
}
