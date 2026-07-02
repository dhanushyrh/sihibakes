import { addDays, format } from "date-fns";
import type { ShopSettings } from "./types";

export const DEFAULT_DAILY_QUANTITY = 20;
export const LOW_STOCK_THRESHOLD = 5;

export function getTodayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getTomorrowDate(): string {
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
}

/** Next open delivery day (today first, then upcoming days). */
export function getNextDeliveryDate(closedDates: string[] = []): string {
  const closed = new Set(closedDates);
  for (let i = 0; i <= 14; i++) {
    const date = format(addDays(new Date(), i), "yyyy-MM-dd");
    if (!closed.has(date)) return date;
  }
  return getTomorrowDate();
}

export function getRemaining(
  quantityLimit: number,
  orderCount: number
): number {
  return Math.max(0, quantityLimit - orderCount);
}

/** Minimum available stock: can't go below units already sold. */
export function minAvailableStock(ordered: number): number {
  return Math.max(0, ordered);
}

import type { DeliveryMode } from "./customer-delivery-slots";

/** Max units of one product per pre-order checkout. */
export const PRE_ORDER_MAX_QUANTITY_PER_ITEM = 5;

export function getMaxQuantityPerItem(
  deliveryMode?: DeliveryMode | null
): number | undefined {
  return deliveryMode === "pre_order"
    ? PRE_ORDER_MAX_QUANTITY_PER_ITEM
    : undefined;
}

export function resolveProductSoldOut(
  product: { is_active: boolean; is_sold_out?: boolean },
  remaining: number,
  deliveryMode?: DeliveryMode | null
): boolean {
  if (!product.is_active || product.is_sold_out) return true;
  if (deliveryMode === "pre_order") return false;
  return isSoldOut(remaining);
}

export function isSoldOut(remaining: number): boolean {
  return remaining <= 0;
}

export function showLowStockBadge(remaining: number): boolean {
  return remaining > 0 && remaining <= LOW_STOCK_THRESHOLD;
}

export function isDayFullySoldOut(
  products: { id: string; is_active: boolean }[],
  quantities: Record<string, number>,
  orderCounts: Record<string, number>,
  date: string
): boolean {
  const active = products.filter((p) => p.is_active);
  if (active.length === 0) return false;

  return active.every((p) => {
    const limit = quantities[`${p.id}:${date}`] ?? DEFAULT_DAILY_QUANTITY;
    const sold = orderCounts[`${p.id}:${date}`] ?? 0;
    return isSoldOut(getRemaining(limit, sold));
  });
}

export function getQuantityLimit(
  availabilityMap: Map<string, number>,
  productId: string,
  date: string
): number {
  return availabilityMap.get(`${productId}:${date}`) ?? DEFAULT_DAILY_QUANTITY;
}
