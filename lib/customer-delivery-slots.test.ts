import { describe, expect, it } from "vitest";
import {
  cartQualifiesForReadyPath,
  getNextSameDaySlot,
  isSlotBookableForOrder,
  SAME_DAY_PREP_LEAD_MINUTES,
  READY_SLOT_LEAD_MINUTES,
} from "./customer-delivery-slots";
import type { DeliverySlot } from "./types";

function slot(
  id: string,
  date: string,
  start: string,
  end: string
): DeliverySlot {
  return {
    id,
    slot_date: date,
    window_start: start,
    window_end: end,
    max_orders: 10,
    orders_booked: 0,
    is_active: true,
  };
}

const todaySlots = [
  slot("morning", "2026-07-03", "11:00:00", "13:00:00"),
  slot("evening", "2026-07-03", "16:00:00", "18:00:00"),
  slot("night", "2026-07-03", "20:00:00", "22:00:00"),
];

const ist = (h: number, m = 0) =>
  new Date(`2026-07-03T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`);

describe("getNextSameDaySlot", () => {
  it("returns morning before 11 AM", () => {
    expect(getNextSameDaySlot(todaySlots, ist(10, 30))?.id).toBe("morning");
  });

  it("rolls forward to evening after 11 AM", () => {
    expect(getNextSameDaySlot(todaySlots, ist(11, 5))?.id).toBe("evening");
  });

  it("rolls forward to night after 4 PM", () => {
    expect(getNextSameDaySlot(todaySlots, ist(16, 1))?.id).toBe("night");
  });
});

describe("same-day lead times", () => {
  const readyStock = new Map([["p1", 5]]);
  const cart = [{ productId: "p1", quantity: 2 }];

  it("allows morning at 6:59 AM via ready or prep", () => {
    const next = getNextSameDaySlot(todaySlots, ist(6, 59));
    const result = isSlotBookableForOrder({
      slot: todaySlots[0],
      nextSlot: next,
      cart,
      readyStockByProduct: readyStock,
      now: ist(6, 59),
    });
    expect(result.bookable).toBe(true);
    expect(["ready", "prep"]).toContain(result.via);
  });

  it("blocks morning prep after the 3-hour cutoff (8:01 AM)", () => {
    const emptyReady = new Map<string, number>();
    const next = getNextSameDaySlot(todaySlots, ist(8, 1));
    const result = isSlotBookableForOrder({
      slot: todaySlots[0],
      nextSlot: next,
      cart,
      readyStockByProduct: emptyReady,
      now: ist(8, 1),
    });
    expect(result.bookable).toBe(false);
  });

  it("allows morning ready path at 10:30 AM", () => {
    const next = getNextSameDaySlot(todaySlots, ist(10, 30));
    const result = isSlotBookableForOrder({
      slot: todaySlots[0],
      nextSlot: next,
      cart,
      readyStockByProduct: readyStock,
      now: ist(10, 30),
    });
    expect(result.bookable).toBe(true);
    expect(result.via).toBe("ready");
  });

  it("blocks morning ready path after 30-minute cutoff", () => {
    const next = getNextSameDaySlot(todaySlots, ist(10, 35));
    const result = isSlotBookableForOrder({
      slot: todaySlots[0],
      nextSlot: next,
      cart,
      readyStockByProduct: readyStock,
      now: ist(10, 35),
    });
    expect(result.bookable).toBe(false);
  });

  it("allows evening prep at 10 AM without consuming ready semantics", () => {
    const next = getNextSameDaySlot(todaySlots, ist(10, 0));
    const result = isSlotBookableForOrder({
      slot: todaySlots[1],
      nextSlot: next,
      cart,
      readyStockByProduct: readyStock,
      now: ist(10, 0),
    });
    expect(result.bookable).toBe(true);
    expect(result.via).toBe("prep");
  });
});

describe("cartQualifiesForReadyPath", () => {
  it("requires full cart coverage", () => {
    const ready = new Map([["p1", 5]]);
    expect(
      cartQualifiesForReadyPath([{ productId: "p1", quantity: 3 }], ready)
    ).toBe(true);
    expect(
      cartQualifiesForReadyPath([{ productId: "p1", quantity: 6 }], ready)
    ).toBe(false);
  });
});

describe("lead constants", () => {
  it("uses 3-hour prep and 30-minute ready lead", () => {
    expect(SAME_DAY_PREP_LEAD_MINUTES).toBe(180);
    expect(READY_SLOT_LEAD_MINUTES).toBe(30);
  });
});
