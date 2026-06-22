import { format } from "date-fns";
import type { DeliverySlot } from "./types";
import { normalizeClosedDates, normalizeDateKey } from "./shop-closed-days";

/** Minimum notice before a same-day slot start time. */
export const SLOT_BOOKING_LEAD_MINUTES = 60;

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

function slotWindowStart(slot: DeliverySlot, now: Date): Date {
  const [startH, startM] = slot.window_start.slice(0, 5).split(":").map(Number);
  const windowStart = new Date(now);
  windowStart.setHours(startH ?? 0, startM ?? 0, 0, 0);
  return windowStart;
}

/** Same-day slots need at least {@link SLOT_BOOKING_LEAD_MINUTES} before the window opens. */
export function isSlotBookableWithLeadTime(
  slot: DeliverySlot,
  now = new Date(),
  leadMinutes = SLOT_BOOKING_LEAD_MINUTES
): boolean {
  if (!isSlotStillBookable(slot, now)) return false;

  const dateKey = normalizeDateKey(slot.slot_date);
  const todayKey = format(now, "yyyy-MM-dd");
  if (dateKey !== todayKey) return true;

  const windowStart = slotWindowStart(slot, now);
  const earliestBookable = new Date(now.getTime() + leadMinutes * 60 * 1000);
  return earliestBookable <= windowStart;
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
    if (!isSlotBookableWithLeadTime(slot, now)) return false;
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

export function getDefaultDeliverySelection(slots: DeliverySlot[]): {
  date: string;
  slotId: string;
} {
  const dates = getBookableDates(slots);
  if (!dates.length) return { date: "", slotId: "" };

  const date = dates[0];
  const dateSlots = getSlotsForBookableDate(slots, date);
  return { date, slotId: dateSlots[0]?.id ?? "" };
}

export function isDeliverySelectionValid(
  slots: DeliverySlot[],
  date: string,
  slotId: string
): boolean {
  if (!date || !slotId) return false;
  const dates = getBookableDates(slots);
  if (!dates.includes(normalizeDateKey(date))) return false;
  return getSlotsForBookableDate(slots, date).some((slot) => slot.id === slotId);
}

export function resolveDeliverySelection(
  slots: DeliverySlot[],
  current: { date: string; slotId: string }
): { date: string; slotId: string } {
  if (isDeliverySelectionValid(slots, current.date, current.slotId)) {
    return current;
  }
  return getDefaultDeliverySelection(slots);
}
