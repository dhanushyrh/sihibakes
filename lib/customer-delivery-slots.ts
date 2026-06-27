import { addDays, format, parseISO } from "date-fns";
import { ORDER_BOOKING_WINDOW_DAYS, PRE_ORDER_MAX_DATES } from "./constants";
import type { DeliverySlot } from "./types";
import { normalizeClosedDates, normalizeDateKey } from "./shop-closed-days";
import {
  shopDateKey,
  shopWallClockToDate,
  shopDatePlusDays,
} from "./shop-timezone";

/** Minimum notice before a same-day slot start time. */
export const SLOT_BOOKING_LEAD_MINUTES = 60;

/** Customer can book while the delivery window has not ended yet. */
export function isSlotStillBookable(
  slot: DeliverySlot,
  now = new Date()
): boolean {
  if (!slot.is_active) return false;

  const dateKey = normalizeDateKey(slot.slot_date);
  const todayKey = shopDateKey(now);
  if (dateKey !== todayKey) return true;

  const windowEnd = shopWallClockToDate(dateKey, slot.window_end);
  return now < windowEnd;
}

function slotWindowStart(slot: DeliverySlot): Date {
  const dateKey = normalizeDateKey(slot.slot_date);
  return shopWallClockToDate(dateKey, slot.window_start);
}

/** Same-day slots need at least {@link SLOT_BOOKING_LEAD_MINUTES} before the window opens. */
export function isSlotBookableWithLeadTime(
  slot: DeliverySlot,
  now = new Date(),
  leadMinutes = SLOT_BOOKING_LEAD_MINUTES
): boolean {
  if (!isSlotStillBookable(slot, now)) return false;

  const dateKey = normalizeDateKey(slot.slot_date);
  const todayKey = shopDateKey(now);
  if (dateKey !== todayKey) return true;

  const windowStart = slotWindowStart(slot);
  const earliestBookable = new Date(now.getTime() + leadMinutes * 60 * 1000);
  return earliestBookable <= windowStart;
}

/** Last bookable calendar date (inclusive) in the shop timezone. */
export function getMaxBookableDateKey(now = new Date()): string {
  return shopDatePlusDays(ORDER_BOOKING_WINDOW_DAYS - 1, now);
}

export function isWithinOrderBookingWindow(
  dateKey: string,
  now = new Date()
): boolean {
  const key = normalizeDateKey(dateKey);
  const today = shopDateKey(now);
  const max = getMaxBookableDateKey(now);
  return key >= today && key <= max;
}

export function filterCustomerDeliverySlots(
  slots: DeliverySlot[],
  closedDates: string[],
  now = new Date()
): DeliverySlot[] {
  const closed = new Set(normalizeClosedDates(closedDates));

  return slots.filter((slot) => {
    if (!slot.is_active) return false;
    if (!isWithinOrderBookingWindow(slot.slot_date, now)) return false;
    if (closed.has(normalizeDateKey(slot.slot_date))) return false;
    if (!isSlotBookableWithLeadTime(slot, now)) return false;
    return true;
  });
}

export function getBookableDates(slots: DeliverySlot[]): string[] {
  return [...new Set(slots.map((s) => normalizeDateKey(s.slot_date)))].sort();
}

export type DateStripEntry = {
  date: string;
  bookable: boolean;
};

/** Calendar days in the booking window (today through max), marking which have slots. */
export function getDateStripEntries(
  slots: DeliverySlot[],
  now = new Date()
): DateStripEntry[] {
  const bookableSet = new Set(getBookableDates(slots));
  const first = parseISO(shopDateKey(now));
  const last = parseISO(getMaxBookableDateKey(now));
  const entries: DateStripEntry[] = [];

  for (let current = first; current <= last; current = addDays(current, 1)) {
    const key = format(current, "yyyy-MM-dd");
    entries.push({ date: key, bookable: bookableSet.has(key) });
  }

  return entries;
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

export type DeliveryMode = "same_day" | "pre_order";

/** Bookable slots for today only. */
export function getSameDaySlots(
  slots: DeliverySlot[],
  now = new Date()
): DeliverySlot[] {
  const today = shopDateKey(now);
  return getSlotsForBookableDate(slots, today);
}

/** Up to {@link PRE_ORDER_MAX_DATES} future bookable dates (excludes today). */
export function getPreOrderDates(
  slots: DeliverySlot[],
  now = new Date()
): string[] {
  const today = shopDateKey(now);
  return getBookableDates(slots)
    .filter((date) => date > today)
    .slice(0, PRE_ORDER_MAX_DATES);
}

/** Slots limited to a delivery mode. */
export function filterSlotsForDeliveryMode(
  slots: DeliverySlot[],
  mode: DeliveryMode,
  now = new Date()
): DeliverySlot[] {
  if (mode === "same_day") {
    const today = shopDateKey(now);
    return slots.filter((s) => normalizeDateKey(s.slot_date) === today);
  }
  const preOrderDates = new Set(getPreOrderDates(slots, now));
  return slots.filter((s) => preOrderDates.has(normalizeDateKey(s.slot_date)));
}

export function getDefaultSelectionForMode(
  slots: DeliverySlot[],
  mode: DeliveryMode,
  now = new Date()
): { date: string; slotId: string } {
  const modeSlots = filterSlotsForDeliveryMode(slots, mode, now);
  return getDefaultDeliverySelection(modeSlots);
}

export function isDeliveryModeSelectionValid(
  slots: DeliverySlot[],
  mode: DeliveryMode,
  date: string,
  slotId: string,
  now = new Date()
): boolean {
  const modeSlots = filterSlotsForDeliveryMode(slots, mode, now);
  return isDeliverySelectionValid(modeSlots, date, slotId);
}
