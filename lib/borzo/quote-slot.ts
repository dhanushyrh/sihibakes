import type { DeliverySlot } from "@/lib/types";
import { SHOP_TIMEZONE, shopDateKey, shopWallClockToDate } from "@/lib/shop-timezone";

/** Borzo slot-delivery quote uses a 4-hour customer delivery window. */
export const BORZO_SLOT_DELIVERY_HOURS = 4;

const PICKUP_LEAD_MINUTES = 30;
const PICKUP_WINDOW_MINUTES = 30;

export type BorzoQuoteWindow = {
  startDate: string;
  startTime: string;
  finishDate: string;
  finishTime: string;
};

export type BorzoQuoteSlot = {
  pickup: BorzoQuoteWindow;
  delivery: BorzoQuoteWindow;
};

const shopTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SHOP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function normalizeTime(time: string): string {
  if (time.length === 5) return `${time}:00`;
  return time;
}

function shopTimeFromDate(date: Date): string {
  return shopTimeFormatter.format(date);
}

function addHoursShop(
  dateKey: string,
  time: string,
  hours: number
): { dateKey: string; time: string } {
  const next = shopWallClockToDate(dateKey, time);
  next.setTime(next.getTime() + hours * 60 * 60 * 1000);
  return { dateKey: shopDateKey(next), time: shopTimeFromDate(next) };
}

function windowFromRange(start: Date, finish: Date): BorzoQuoteWindow {
  return {
    startDate: shopDateKey(start),
    startTime: shopTimeFromDate(start),
    finishDate: shopDateKey(finish),
    finishTime: shopTimeFromDate(finish),
  };
}

/** Build pickup + 4-hour delivery windows anchored to a customer slot start time. */
export function buildBorzoQuoteSlotFromWindow(
  date: string,
  windowStart: string
): BorzoQuoteSlot {
  const deliveryStart = shopWallClockToDate(date, windowStart);
  const deliveryFinish = addHoursShop(date, windowStart, BORZO_SLOT_DELIVERY_HOURS);

  const pickupFinish = new Date(
    deliveryStart.getTime() - PICKUP_LEAD_MINUTES * 60 * 1000
  );
  const pickupStart = new Date(
    pickupFinish.getTime() - PICKUP_WINDOW_MINUTES * 60 * 1000
  );

  return {
    pickup: windowFromRange(pickupStart, pickupFinish),
    delivery: {
      startDate: date,
      startTime: normalizeTime(windowStart),
      finishDate: deliveryFinish.dateKey,
      finishTime: deliveryFinish.time,
    },
  };
}

export function buildBorzoQuoteSlotFromDeliverySlot(
  slot: Pick<DeliverySlot, "slot_date" | "window_start">
): BorzoQuoteSlot {
  return buildBorzoQuoteSlotFromWindow(slot.slot_date, slot.window_start);
}

/** Fallback when no bookable shop slot exists — quote from store with a near-term 4-hour window. */
export function buildDefaultBorzoQuoteSlot(now = new Date()): BorzoQuoteSlot {
  const pickupStart = new Date(now.getTime() + PICKUP_LEAD_MINUTES * 60 * 1000);
  const pickupFinish = new Date(
    pickupStart.getTime() + PICKUP_WINDOW_MINUTES * 60 * 1000
  );
  const deliveryFinish = new Date(
    pickupFinish.getTime() + BORZO_SLOT_DELIVERY_HOURS * 60 * 60 * 1000
  );

  return {
    pickup: windowFromRange(pickupStart, pickupFinish),
    delivery: windowFromRange(pickupFinish, deliveryFinish),
  };
}
