import { addDays, format, parseISO } from "date-fns";
import { ORDER_BOOKING_WINDOW_DAYS, PRE_ORDER_MAX_DATES, PRE_ORDER_SCAN_DAYS } from "./constants";
import type { DeliverySlot } from "./types";
import { normalizeClosedDates, normalizeDateKey } from "./shop-closed-days";
import {
  shopDateKey,
  shopWallClockToDate,
  shopDatePlusDays,
} from "./shop-timezone";

/** Minimum notice before a same-day slot when items need kitchen prep. */
export const SAME_DAY_PREP_LEAD_MINUTES = 180;

/** Minimum notice for the next slot when cart is fully covered by ready stock. */
export const READY_SLOT_LEAD_MINUTES = 30;

/** @deprecated Use {@link SAME_DAY_PREP_LEAD_MINUTES} */
export const SLOT_BOOKING_LEAD_MINUTES = SAME_DAY_PREP_LEAD_MINUTES;

export type CartLine = { productId: string; quantity: number };

export type SlotBookableVia = "ready" | "prep";

export type SlotBookability = {
  bookable: boolean;
  via: SlotBookableVia | null;
};

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

export function slotWindowStart(slot: DeliverySlot): Date {
  const dateKey = normalizeDateKey(slot.slot_date);
  return shopWallClockToDate(dateKey, slot.window_start);
}

export function getReadyAvailable(
  readyQuantity: number,
  readyReserved = 0,
  readyFulfilled = 0
): number {
  return Math.max(0, readyQuantity - readyReserved - readyFulfilled);
}

export function buildReadyStockMap(
  products: { id: string; ready_available?: number }[]
): ReadonlyMap<string, number> {
  return new Map(
    products.map((p) => [p.id, Math.max(0, p.ready_available ?? 0)])
  );
}

export function cartQualifiesForReadyPath(
  cart: CartLine[],
  readyStockByProduct: ReadonlyMap<string, number>
): boolean {
  if (!cart.length) return false;
  return cart.every(
    (item) => item.quantity <= (readyStockByProduct.get(item.productId) ?? 0)
  );
}

/** Earliest same-day slot whose window has not started yet (rolls forward automatically). */
export function getNextSameDaySlot(
  slots: DeliverySlot[],
  now = new Date()
): DeliverySlot | null {
  const today = shopDateKey(now);
  const todaySlots = getSlotsForBookableDate(slots, today).filter(
    (s) => s.is_active && isSlotStillBookable(s, now)
  );

  for (const slot of todaySlots) {
    if (now < slotWindowStart(slot)) return slot;
  }

  return null;
}

function meetsPrepLead(slot: DeliverySlot, now: Date): boolean {
  const windowStart = slotWindowStart(slot);
  const earliestBookable = new Date(
    now.getTime() + SAME_DAY_PREP_LEAD_MINUTES * 60 * 1000
  );
  return earliestBookable <= windowStart;
}

function meetsReadyLead(slot: DeliverySlot, now: Date): boolean {
  const windowStart = slotWindowStart(slot);
  const earliestBookable = new Date(
    now.getTime() + READY_SLOT_LEAD_MINUTES * 60 * 1000
  );
  return earliestBookable <= windowStart;
}

export function isSlotBookableForOrder(params: {
  slot: DeliverySlot;
  nextSlot: DeliverySlot | null;
  cart: CartLine[];
  readyStockByProduct: ReadonlyMap<string, number>;
  now?: Date;
}): SlotBookability {
  const {
    slot,
    nextSlot,
    cart,
    readyStockByProduct,
    now = new Date(),
  } = params;

  if (!isSlotStillBookable(slot, now)) {
    return { bookable: false, via: null };
  }

  const dateKey = normalizeDateKey(slot.slot_date);
  const todayKey = shopDateKey(now);

  if (dateKey !== todayKey) {
    return { bookable: true, via: "prep" };
  }

  const readyOk =
    nextSlot != null &&
    slot.id === nextSlot.id &&
    cartQualifiesForReadyPath(cart, readyStockByProduct) &&
    meetsReadyLead(slot, now);

  if (readyOk) {
    return { bookable: true, via: "ready" };
  }

  if (meetsPrepLead(slot, now)) {
    return { bookable: true, via: "prep" };
  }

  return { bookable: false, via: null };
}

/** Same-day prep lead only — used when cart context is unavailable. */
export function isSlotBookableWithLeadTime(
  slot: DeliverySlot,
  now = new Date(),
  leadMinutes = SAME_DAY_PREP_LEAD_MINUTES
): boolean {
  if (!isSlotStillBookable(slot, now)) return false;

  const dateKey = normalizeDateKey(slot.slot_date);
  const todayKey = shopDateKey(now);
  if (dateKey !== todayKey) return true;

  const windowStart = slotWindowStart(slot);
  const earliestBookable = new Date(now.getTime() + leadMinutes * 60 * 1000);
  return earliestBookable <= windowStart;
}

export function resolveUsesReadyStock(params: {
  deliveryMode: DeliveryMode;
  slot: DeliverySlot;
  allSlots: DeliverySlot[];
  cart: CartLine[];
  readyStockByProduct: ReadonlyMap<string, number>;
  now?: Date;
}): boolean {
  const { deliveryMode, slot, allSlots, cart, readyStockByProduct, now } =
    params;

  if (deliveryMode !== "same_day") return false;

  const nextSlot = getNextSameDaySlot(allSlots, now);
  const { via } = isSlotBookableForOrder({
    slot,
    nextSlot,
    cart,
    readyStockByProduct,
    now,
  });

  return via === "ready";
}

/** Last bookable calendar date (inclusive) in the shop timezone. */
export function getMaxBookableDateKey(
  now = new Date(),
  bookingWindowDays = ORDER_BOOKING_WINDOW_DAYS
): string {
  return shopDatePlusDays(bookingWindowDays - 1, now);
}

export function isWithinOrderBookingWindow(
  dateKey: string,
  now = new Date(),
  bookingWindowDays = ORDER_BOOKING_WINDOW_DAYS
): boolean {
  const key = normalizeDateKey(dateKey);
  const today = shopDateKey(now);
  const max = getMaxBookableDateKey(now, bookingWindowDays);
  return key >= today && key <= max;
}

export function filterCustomerDeliverySlots(
  slots: DeliverySlot[],
  closedDates: string[],
  now = new Date(),
  bookingWindowDays = ORDER_BOOKING_WINDOW_DAYS
): DeliverySlot[] {
  const closed = new Set(normalizeClosedDates(closedDates));

  return slots.filter((slot) => {
    if (!slot.is_active) return false;
    if (!isWithinOrderBookingWindow(slot.slot_date, now, bookingWindowDays)) {
      return false;
    }
    if (closed.has(normalizeDateKey(slot.slot_date))) return false;
    if (!isSlotBookableWithLeadTime(slot, now)) return false;
    return true;
  });
}

/** Active slots in the booking window — lead-time filtering applied separately at checkout. */
export function filterCustomerDeliverySlotsBase(
  slots: DeliverySlot[],
  closedDates: string[],
  now = new Date(),
  bookingWindowDays = ORDER_BOOKING_WINDOW_DAYS
): DeliverySlot[] {
  const closed = new Set(normalizeClosedDates(closedDates));

  return slots.filter((slot) => {
    if (!slot.is_active) return false;
    if (!isWithinOrderBookingWindow(slot.slot_date, now, bookingWindowDays)) {
      return false;
    }
    if (closed.has(normalizeDateKey(slot.slot_date))) return false;
    return true;
  });
}

export function filterCustomerDeliverySlotsForOrder(
  slots: DeliverySlot[],
  closedDates: string[],
  cart: CartLine[],
  readyStockByProduct: ReadonlyMap<string, number>,
  now = new Date(),
  bookingWindowDays = ORDER_BOOKING_WINDOW_DAYS
): DeliverySlot[] {
  const closed = new Set(normalizeClosedDates(closedDates));
  const nextSlot = getNextSameDaySlot(slots, now);

  return slots.filter((slot) => {
    if (!slot.is_active) return false;
    if (!isWithinOrderBookingWindow(slot.slot_date, now, bookingWindowDays)) {
      return false;
    }
    if (closed.has(normalizeDateKey(slot.slot_date))) return false;

    const { bookable } = isSlotBookableForOrder({
      slot,
      nextSlot,
      cart,
      readyStockByProduct,
      now,
    });
    return bookable;
  });
}

export function getSlotBookabilityMap(
  slots: DeliverySlot[],
  cart: CartLine[],
  readyStockByProduct: ReadonlyMap<string, number>,
  now = new Date()
): Map<string, SlotBookableVia> {
  const nextSlot = getNextSameDaySlot(slots, now);
  const map = new Map<string, SlotBookableVia>();

  for (const slot of slots) {
    const { bookable, via } = isSlotBookableForOrder({
      slot,
      nextSlot,
      cart,
      readyStockByProduct,
      now,
    });
    if (bookable && via) {
      map.set(slot.id, via);
    }
  }

  return map;
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
  const bookable = new Set(getBookableDates(slots));
  const dates: string[] = [];
  const maxScanDate = getMaxBookableDateKey(now, PRE_ORDER_SCAN_DAYS);

  for (let offset = 1; dates.length < PRE_ORDER_MAX_DATES; offset++) {
    const key = shopDatePlusDays(offset, now);
    if (key > maxScanDate) break;
    if (bookable.has(key)) {
      dates.push(key);
    }
  }

  return dates;
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
