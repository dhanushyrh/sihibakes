import type { Order } from "@/lib/types";

function formatTime12h(time: string): string {
  const [hourPart, minutePart] = time.slice(0, 5).split(":");
  const hour = Number.parseInt(hourPart ?? "0", 10);
  const minute = minutePart ?? "00";
  if (Number.isNaN(hour)) return time.slice(0, 5);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

export function formatDispatchEtaFromWindow(
  date: string,
  windowStart: string,
  windowEnd: string
): string {
  return formatDispatchEta({
    delivery_date: date,
    delivery_window_start: windowStart,
    delivery_window_end: windowEnd,
    delivery_eta_display: null,
  });
}

/** ETA line for out-for-delivery WhatsApp, e.g. "4 Jul, 6:00–8:00 PM". */
export function formatDispatchEta(
  order: Pick<
    Order,
    | "delivery_date"
    | "delivery_window_start"
    | "delivery_window_end"
    | "delivery_eta_display"
  >
): string {
  if (order.delivery_eta_display?.trim()) {
    return order.delivery_eta_display.trim();
  }

  const date = new Date(`${order.delivery_date}T12:00:00`);
  const dateLabel = Number.isNaN(date.getTime())
    ? order.delivery_date
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const start = formatTime12h(order.delivery_window_start);
  const end = formatTime12h(order.delivery_window_end);
  return `${dateLabel}, ${start}–${end}`;
}

/** Delivery slot for order confirmation, e.g. "4 Jul, 6:00 PM – 8:00 PM". */
export function formatOrderConfirmedDeliverySlot(
  order: Pick<Order, "delivery_date" | "delivery_window_start" | "delivery_window_end">
): string {
  const date = new Date(`${order.delivery_date}T12:00:00`);
  const dateLabel = Number.isNaN(date.getTime())
    ? order.delivery_date
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const start = formatTime12h(order.delivery_window_start);
  const end = formatTime12h(order.delivery_window_end);
  return `${dateLabel}, ${start} – ${end}`;
}
