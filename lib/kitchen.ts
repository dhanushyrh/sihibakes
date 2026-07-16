import type { Order, OrderItem, OrderStatus, Product } from "@/lib/types";
import {
  formatDeliveryWindow,
  formatOrderItems,
  orderItemTitle,
  type RosterOrder,
} from "@/lib/order-roster";

/** Orders kitchen still needs to act on for a slot. */
export const KITCHEN_ACTIVE_STATUSES: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
] as const;

/** Paid orders that appear on the kitchen board for a delivery day. */
export const KITCHEN_BOARD_STATUSES: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "self_delivered",
] as const;

export type KitchenOrder = RosterOrder;

export type KitchenBakeLine = {
  productId: string;
  title: string;
  totalQty: number;
  /** Units on ready-stock orders (already baked / pull from fridge). */
  readyQty: number;
  /** Units that still need kitchen prep. */
  prepQty: number;
  orderCount: number;
};

export type KitchenSlotCounts = {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  dispatched: number;
  done: number;
  readyStockOrders: number;
  prepOrders: number;
};

export type KitchenSlotBoard = {
  key: string;
  windowStart: string;
  windowEnd: string;
  windowLabel: string;
  counts: KitchenSlotCounts;
  bakeLines: KitchenBakeLine[];
  orders: KitchenOrder[];
};

export type KitchenBoard = {
  date: string;
  slots: KitchenSlotBoard[];
  totals: KitchenSlotCounts;
  bakeLines: KitchenBakeLine[];
};

function emptyCounts(): KitchenSlotCounts {
  return {
    total: 0,
    pending: 0,
    confirmed: 0,
    preparing: 0,
    dispatched: 0,
    done: 0,
    readyStockOrders: 0,
    prepOrders: 0,
  };
}

function bumpCounts(counts: KitchenSlotCounts, order: KitchenOrder): void {
  counts.total += 1;
  switch (order.status) {
    case "pending":
      counts.pending += 1;
      break;
    case "confirmed":
      counts.confirmed += 1;
      break;
    case "preparing":
      counts.preparing += 1;
      break;
    case "out_for_delivery":
      counts.dispatched += 1;
      break;
    case "delivered":
    case "self_delivered":
      counts.done += 1;
      break;
  }
  if (order.uses_ready_stock) counts.readyStockOrders += 1;
  else counts.prepOrders += 1;
}

function addBakeLine(
  map: Map<string, KitchenBakeLine>,
  item: OrderItem & { products?: Product | null },
  usesReadyStock: boolean
): void {
  const productId = item.product_id;
  const title = orderItemTitle(item);
  const existing = map.get(productId) ?? {
    productId,
    title,
    totalQty: 0,
    readyQty: 0,
    prepQty: 0,
    orderCount: 0,
  };
  existing.totalQty += item.quantity;
  if (usesReadyStock) existing.readyQty += item.quantity;
  else existing.prepQty += item.quantity;
  existing.orderCount += 1;
  map.set(productId, existing);
}

function sortBakeLines(lines: KitchenBakeLine[]): KitchenBakeLine[] {
  return [...lines].sort((a, b) => {
    if (b.prepQty !== a.prepQty) return b.prepQty - a.prepQty;
    if (b.totalQty !== a.totalQty) return b.totalQty - a.totalQty;
    return a.title.localeCompare(b.title);
  });
}

export function slotKey(windowStart: string, windowEnd: string): string {
  return `${windowStart}|${windowEnd}`;
}

export function isKitchenActiveStatus(status: OrderStatus | string): boolean {
  return (KITCHEN_ACTIVE_STATUSES as readonly string[]).includes(status);
}

/** Bake list only needs units still in kitchen pipeline (not yet dispatched). */
export function orderCountsTowardBake(order: Pick<Order, "status">): boolean {
  return isKitchenActiveStatus(order.status);
}

export function buildKitchenBoard(
  date: string,
  orders: KitchenOrder[]
): KitchenBoard {
  const slotMap = new Map<
    string,
    {
      windowStart: string;
      windowEnd: string;
      orders: KitchenOrder[];
      counts: KitchenSlotCounts;
      bakeMap: Map<string, KitchenBakeLine>;
    }
  >();

  const dayBakeMap = new Map<string, KitchenBakeLine>();
  const totals = emptyCounts();

  const sorted = [...orders].sort((a, b) => {
    const slotCmp = a.delivery_window_start.localeCompare(b.delivery_window_start);
    if (slotCmp !== 0) return slotCmp;
    return a.created_at.localeCompare(b.created_at);
  });

  for (const order of sorted) {
    const windowStart = order.delivery_window_start;
    const windowEnd = order.delivery_window_end;
    const key = slotKey(windowStart, windowEnd);
    const slot = slotMap.get(key) ?? {
      windowStart,
      windowEnd,
      orders: [] as KitchenOrder[],
      counts: emptyCounts(),
      bakeMap: new Map<string, KitchenBakeLine>(),
    };

    slot.orders.push(order);
    bumpCounts(slot.counts, order);
    bumpCounts(totals, order);

    if (orderCountsTowardBake(order)) {
      for (const item of order.order_items ?? []) {
        addBakeLine(slot.bakeMap, item, Boolean(order.uses_ready_stock));
        addBakeLine(dayBakeMap, item, Boolean(order.uses_ready_stock));
      }
    }

    slotMap.set(key, slot);
  }

  const slots: KitchenSlotBoard[] = [...slotMap.values()]
    .sort((a, b) => a.windowStart.localeCompare(b.windowStart))
    .map((slot) => ({
      key: slotKey(slot.windowStart, slot.windowEnd),
      windowStart: slot.windowStart,
      windowEnd: slot.windowEnd,
      windowLabel: formatDeliveryWindow(slot.windowStart, slot.windowEnd),
      counts: slot.counts,
      bakeLines: sortBakeLines([...slot.bakeMap.values()]),
      orders: slot.orders,
    }));

  return {
    date,
    slots,
    totals,
    bakeLines: sortBakeLines([...dayBakeMap.values()]),
  };
}

export function formatKitchenOrderItems(order: KitchenOrder): string {
  return formatOrderItems(order.order_items ?? []);
}

export function kitchenProgressLabel(counts: KitchenSlotCounts): string {
  const active = counts.pending + counts.confirmed + counts.preparing;
  if (counts.total === 0) return "No orders";
  if (active === 0) return "All clear";
  if (counts.preparing > 0 && counts.confirmed === 0 && counts.pending === 0) {
    return `${counts.preparing} preparing`;
  }
  const parts: string[] = [];
  if (counts.pending > 0) parts.push(`${counts.pending} to confirm`);
  if (counts.confirmed > 0) parts.push(`${counts.confirmed} to prep`);
  if (counts.preparing > 0) parts.push(`${counts.preparing} in kitchen`);
  return parts.join(" · ");
}
