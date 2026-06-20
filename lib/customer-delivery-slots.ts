import { format } from "date-fns";
import type { DeliverySlot } from "./types";
import { normalizeClosedDates, normalizeDateKey } from "./shop-closed-days";

/** Customer can book while the delivery window has not ended yet. */
export function isSlotStillBookable(
  slot: DeliverySlot,
  now = new Date()
): boolean {
  if (!slot.is_active) return false;

  const dateKey = normalizeDateKey(slot.slot_date);
  const todayKey = format(now, "yyyy-MM-dd");
  if (dateKey !== todayKey) return true;

  const [endH, endM] = slot.window_end.slice(0, 5).split(":").map(Number);
  const windowEnd = new Date(now);
  windowEnd.setHours(endH ?? 0, endM ?? 0, 0, 0);
  return now < windowEnd;
}

export function filterCustomerDeliverySlots(
  slots: DeliverySlot[],
  closedDates: string[],
  now = new Date()
): DeliverySlot[] {
  const closed = new Set(normalizeClosedDates(closedDates));

  return slots.filter((slot) => {
    if (!slot.is_active) return false;
    if (closed.has(normalizeDateKey(slot.slot_date))) return false;
    if (!isSlotStillBookable(slot, now)) return false;
    return true;
  });
}

export function getBookableDates(slots: DeliverySlot[]): string[] {
  return [...new Set(slots.map((s) => normalizeDateKey(s.slot_date)))].sort();
}

export function getSlotsForBookableDate(
  slots: DeliverySlot[],
  date: string
): DeliverySlot[] {
  const key = normalizeDateKey(date);
  return slots
    .filter((s) => normalizeDateKey(s.slot_date) === key)
    .sort((a, b) => a.window_start.localeCompare(b.window_start));
}
