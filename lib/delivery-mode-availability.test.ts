import { describe, expect, it } from "vitest";
import {
  computeDeliveryModeAvailability,
  getBookableSameDaySlots,
  getSameDayBlockMessage,
  isSameDaySoldOutReason,
} from "@/lib/delivery-mode-availability";
import type { DeliverySlot } from "@/lib/types";
import { shopDateKey, shopDatePlusDays } from "@/lib/shop-timezone";

function slot(
  id: string,
  date: string,
  start: string,
  end: string,
  isActive = true
): DeliverySlot {
  return {
    id,
    slot_date: date,
    window_start: start,
    window_end: end,
    max_orders: 10,
    orders_booked: 0,
    is_active: isActive,
  };
}

describe("same-day mode availability when slots are closed", () => {
  it("disables same-day when every today slot is inactive", () => {
    const today = shopDateKey();
    const tomorrow = shopDatePlusDays(1);
    const result = computeDeliveryModeAvailability({
      ordersAccepting: true,
      todayClosed: false,
      hasTodayInventory: true,
      slots: [
        slot("a", today, "18:00:00", "20:00:00", false),
        slot("b", tomorrow, "10:00:00", "12:00:00", true),
      ],
    });

    expect(result.sameDayEnabled).toBe(false);
    expect(result.sameDayReason).toBe("no_same_day_slots");
    expect(isSameDaySoldOutReason(result.sameDayReason)).toBe(true);
    expect(getSameDayBlockMessage("no_same_day_slots")).toMatch(
      /Sold out for today/i
    );
  });

  it("disables same-day when remaining slots are past prep lead time", () => {
    const today = "2026-07-15";
    // 14:30 IST → 16:00 slot needs 180 min prep, so it is past cutoff.
    const now = new Date(`2026-07-15T14:30:00+05:30`);
    const slots = [slot("late", today, "16:00:00", "18:00:00", true)];

    expect(getBookableSameDaySlots(slots, now)).toHaveLength(0);

    const result = computeDeliveryModeAvailability({
      ordersAccepting: true,
      todayClosed: false,
      hasTodayInventory: true,
      slots,
      now,
    });

    expect(result.sameDayEnabled).toBe(false);
    expect(result.sameDayReason).toBe("no_same_day_slots");
  });

  it("keeps same-day enabled when a bookable slot remains", () => {
    const today = "2026-07-15";
    const now = new Date(`2026-07-15T10:00:00+05:30`);
    const slots = [slot("ok", today, "16:00:00", "18:00:00", true)];

    const result = computeDeliveryModeAvailability({
      ordersAccepting: true,
      todayClosed: false,
      hasTodayInventory: true,
      slots,
      now,
    });

    expect(result.sameDayEnabled).toBe(true);
    expect(result.sameDayReason).toBeNull();
    expect(result.sameDaySlots.length).toBeGreaterThan(0);
  });

  it("uses sold_out_today when inventory is gone even if slots remain", () => {
    const today = "2026-07-15";
    const now = new Date(`2026-07-15T10:00:00+05:30`);
    const result = computeDeliveryModeAvailability({
      ordersAccepting: true,
      todayClosed: false,
      hasTodayInventory: false,
      slots: [slot("ok", today, "16:00:00", "18:00:00", true)],
      now,
    });

    expect(result.sameDayEnabled).toBe(false);
    expect(result.sameDayReason).toBe("sold_out_today");
  });
});
