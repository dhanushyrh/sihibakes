import { format, parseISO } from "date-fns";
import {
  getPreOrderDates,
  getSameDaySlots,
  isSlotBookableWithLeadTime,
  type DeliveryMode,
} from "@/lib/customer-delivery-slots";
import type { DeliverySlot } from "@/lib/types";
import { isShopToday, isShopTomorrow } from "@/lib/shop-timezone";

export type SameDayBlockReason =
  | "orders_paused"
  | "store_closed_today"
  | "sold_out_today"
  | "no_same_day_slots";

export type DeliveryModeAvailability = {
  ordersAccepting: boolean;
  sameDayEnabled: boolean;
  sameDayReason: SameDayBlockReason | null;
  sameDaySlots: DeliverySlot[];
  preOrderEnabled: boolean;
  preOrderDates: string[];
  defaultPreOrderDate: string;
};

export function formatDeliveryDateLabel(dateKey: string): string {
  if (isShopToday(dateKey)) return "Today";
  if (isShopTomorrow(dateKey)) return "Tomorrow";
  return format(parseISO(dateKey), "EEE, d MMM");
}

export function formatDeliveryModeSummary(
  mode: DeliveryMode,
  dateKey: string
): string {
  const dateLabel = formatDeliveryDateLabel(dateKey);
  return mode === "same_day" ? `Same day · ${dateLabel}` : `Pre-order · ${dateLabel}`;
}

export function formatSlotTime(time: string): string {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return format(d, "h:mm a");
}

export function getSameDayBlockMessage(reason: SameDayBlockReason): string {
  switch (reason) {
    case "orders_paused":
      return "Ordering paused — please check back soon.";
    case "store_closed_today":
      return "Store closed today — pre-order for another day.";
    case "sold_out_today":
      return "Sold out for today — pre-order for the next available date.";
    case "no_same_day_slots":
      return "Sold out for today — no same-day delivery slots left. Choose a pre-order date.";
  }
}

/** True when same-day is blocked because nothing can be fulfilled today. */
export function isSameDaySoldOutReason(
  reason: SameDayBlockReason | null
): boolean {
  return reason === "sold_out_today" || reason === "no_same_day_slots";
}

/**
 * Bookable same-day slots for the mode-choice screen.
 * Uses prep lead time (no cart yet) so we don't offer Same Day when every
 * remaining window is past the kitchen cut-off or all slots are closed.
 */
export function getBookableSameDaySlots(
  slots: DeliverySlot[],
  now = new Date()
): DeliverySlot[] {
  return getSameDaySlots(slots, now).filter((slot) =>
    isSlotBookableWithLeadTime(slot, now)
  );
}

/** Server-side availability for the delivery mode choice screen. */
export function computeDeliveryModeAvailability(input: {
  ordersAccepting: boolean;
  todayClosed: boolean;
  slots: DeliverySlot[];
  hasTodayInventory: boolean;
  now?: Date;
}): DeliveryModeAvailability {
  const {
    ordersAccepting,
    todayClosed,
    slots,
    hasTodayInventory,
    now = new Date(),
  } = input;
  const sameDaySlots = getBookableSameDaySlots(slots, now);
  const preOrderDates = getPreOrderDates(slots, now);

  let sameDayEnabled = true;
  let sameDayReason: SameDayBlockReason | null = null;

  if (!ordersAccepting) {
    sameDayEnabled = false;
    sameDayReason = "orders_paused";
  } else if (todayClosed) {
    sameDayEnabled = false;
    sameDayReason = "store_closed_today";
  } else if (!hasTodayInventory) {
    sameDayEnabled = false;
    sameDayReason = "sold_out_today";
  } else if (sameDaySlots.length === 0) {
    sameDayEnabled = false;
    sameDayReason = "no_same_day_slots";
  }

  return {
    ordersAccepting,
    sameDayEnabled,
    sameDayReason,
    sameDaySlots,
    preOrderEnabled: preOrderDates.length > 0,
    preOrderDates,
    defaultPreOrderDate: preOrderDates[0] ?? "",
  };
}
