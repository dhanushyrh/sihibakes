import { describe, expect, it } from "vitest";
import {
  buildKitchenBoard,
  kitchenProgressLabel,
  kitchenSummaryChips,
  orderCountsTowardBake,
  type KitchenOrder,
} from "./kitchen";
import type { Product } from "./types";

const tiramisu = { title: "Classic Tiramisu" } as Product;
const brownie = { title: "Brownie" } as Product;

function makeOrder(
  partial: Partial<KitchenOrder> & {
    id: string;
    status: KitchenOrder["status"];
  }
): KitchenOrder {
  const { id, status, ...rest } = partial;
  return {
    id,
    order_number: "SIHI-20260716-0001",
    customer_id: null,
    customer_name: "Test",
    phone: "9999999999",
    alt_phone: "",
    house: "1",
    street: "Street",
    landmark: null,
    pincode: "560001",
    delivery_lat: 12.97,
    delivery_lng: 77.59,
    distance_km: 3,
    delivery_fee_inr: 50,
    subtotal_inr: 500,
    discount_inr: 0,
    total_inr: 550,
    coupon_id: null,
    delivery_date: "2026-07-16",
    delivery_window_start: "16:00:00",
    delivery_window_end: "18:00:00",
    delivery_slot_id: "slot-1",
    uses_ready_stock: false,
    order_source: "online",
    payment_mode: null,
    payment_status: "paid",
    razorpay_order_id: null,
    razorpay_payment_id: null,
    status,
    cancellation_notes: null,
    cancelled_at: null,
    refund_notes: null,
    refunded_at: null,
    refund_amount_inr: null,
    refund_txn_id: null,
    delivery_vendor: null,
    delivery_partner_order_id: null,
    delivery_otp: null,
    delivery_partner_name: null,
    delivery_eta_display: null,
    out_for_delivery_at: null,
    created_at: "2026-07-16T08:00:00.000Z",
    order_items: [
      {
        id: "item-1",
        order_id: id,
        product_id: "prod-tiramisu",
        quantity: 2,
        unit_price_inr: 250,
        line_total_inr: 500,
        products: tiramisu,
      },
    ],
    ...rest,
  };
}

describe("buildKitchenBoard", () => {
  it("groups bake totals by slot and splits ready vs prep", () => {
    const board = buildKitchenBoard("2026-07-16", [
      makeOrder({
        id: "o1",
        status: "confirmed",
        uses_ready_stock: false,
      }),
      makeOrder({
        id: "o2",
        status: "confirmed",
        order_number: "SIHI-20260716-0002",
        uses_ready_stock: true,
        created_at: "2026-07-16T09:00:00.000Z",
      }),
      makeOrder({
        id: "o3",
        status: "preparing",
        order_number: "SIHI-20260716-0003",
        delivery_window_start: "20:00:00",
        delivery_window_end: "22:00:00",
        order_items: [
          {
            id: "item-2",
            order_id: "o3",
            product_id: "prod-brownie",
            quantity: 3,
            unit_price_inr: 100,
            line_total_inr: 300,
            products: brownie,
          },
        ],
      }),
    ]);

    expect(board.slots).toHaveLength(2);
    expect(board.slots[0].windowLabel).toBe("16:00 – 18:00");
    expect(board.slots[0].bakeLines[0]).toMatchObject({
      productId: "prod-tiramisu",
      title: "Classic Tiramisu",
      totalQty: 4,
      prepQty: 2,
      readyQty: 2,
    });
    expect(board.slots[1].bakeLines[0]).toMatchObject({
      title: "Brownie",
      prepQty: 3,
      readyQty: 0,
    });
    expect(board.totals.confirmed).toBe(2);
    expect(board.totals.preparing).toBe(1);
  });

  it("excludes dispatched orders from bake totals", () => {
    const board = buildKitchenBoard("2026-07-16", [
      makeOrder({
        id: "o1",
        status: "out_for_delivery",
        order_items: [
          {
            id: "item-1",
            order_id: "o1",
            product_id: "prod-tiramisu",
            quantity: 5,
            unit_price_inr: 250,
            line_total_inr: 1250,
            products: tiramisu,
          },
        ],
      }),
    ]);

    expect(orderCountsTowardBake({ status: "out_for_delivery" })).toBe(false);
    expect(board.slots[0].bakeLines).toHaveLength(0);
    expect(board.slots[0].counts.dispatched).toBe(1);
  });
});

describe("kitchenProgressLabel", () => {
  it("uses clear order-status language", () => {
    expect(
      kitchenProgressLabel({
        total: 5,
        pending: 1,
        confirmed: 2,
        preparing: 2,
        dispatched: 0,
        done: 0,
        readyStockOrders: 1,
        prepOrders: 4,
      })
    ).toBe(
      "1 order needs confirm · 2 orders ready to start · 2 orders being prepared"
    );
  });

  it("describes a single confirmed order clearly", () => {
    expect(
      kitchenProgressLabel({
        total: 1,
        pending: 0,
        confirmed: 1,
        preparing: 0,
        dispatched: 0,
        done: 0,
        readyStockOrders: 0,
        prepOrders: 1,
      })
    ).toBe("1 order ready to start");
  });
});

describe("kitchenSummaryChips", () => {
  it("omits zero statuses and clarifies waiting orders", () => {
    expect(
      kitchenSummaryChips({
        total: 1,
        pending: 0,
        confirmed: 1,
        preparing: 0,
        dispatched: 0,
        done: 0,
        readyStockOrders: 0,
        prepOrders: 1,
      })
    ).toEqual(["1 order", "1 waiting to start"]);
  });
});
