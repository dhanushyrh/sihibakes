import type { DeliverySlot } from "./types";
import { normalizeClosedDates, normalizeDateKey } from "./shop-closed-days";

export function getSlotsForDate(
  slots: DeliverySlot[],
  date: string
): DeliverySlot[] {
  return slots.filter((s) => s.slot_date === date);
}

/** Day has windows configured but every window is off. */
export function isDayClosedBySlots(
  slots: DeliverySlot[],
  date: string
): boolean {
  const daySlots = getSlotsForDate(slots, date);
  return daySlots.length > 0 && daySlots.every((s) => !s.is_active);
}

/** Store is closed when marked in settings or all delivery windows are off. */
export function isDayClosed(
  date: string,
  closedDates: string[],
  slots: DeliverySlot[]
): boolean {
  const key = normalizeDateKey(date);
  const closed = new Set(normalizeClosedDates(closedDates));
  return closed.has(key) || isDayClosedBySlots(slots, key);
}
