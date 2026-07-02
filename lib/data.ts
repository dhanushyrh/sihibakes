import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeliveryFeeSlab, DeliverySlot, Product, ShopSettings, CustomerReview, ProductTag } from "@/lib/types";
import { cache } from "react";
import { format } from "date-fns";
import {
  getNextDeliveryDate,
  getQuantityLimit,
  getRemaining,
  isSoldOut,
  showLowStockBadge,
} from "@/lib/inventory";
import {
  getMockSlots,
  isSupabaseConfigured,
  MOCK_PRODUCTS,
  MOCK_REVIEWS,
  MOCK_SETTINGS,
  MOCK_SLABS,
} from "@/lib/mock-data";
import { normalizeClosedDates, normalizeDateKey } from "@/lib/shop-closed-days";
import { ORDER_BOOKING_WINDOW_DAYS } from "@/lib/constants";
import { filterCustomerDeliverySlots } from "@/lib/customer-delivery-slots";
import { computeDeliveryModeAvailability } from "@/lib/delivery-mode-availability";
import { shopDateKey, shopDatePlusDays } from "@/lib/shop-timezone";

export type HubMarqueeProduct = Pick<
  Product,
  "id" | "title" | "image_path" | "price_inr" | "discount_percent" | "tags"
>;

function hubMarqueeTagScore(product: HubMarqueeProduct): number {
  let score = 0;
  if (product.tags.includes("bestseller")) score += 4;
  if (product.tags.includes("must_try")) score += 3;
  if (product.tags.includes("chef_special")) score += 2;
  if (product.tags.includes("new")) score += 1;
  return score;
}

function sortHubMarqueeProducts(products: HubMarqueeProduct[]): HubMarqueeProduct[] {
  return [...products].sort((a, b) => hubMarqueeTagScore(b) - hubMarqueeTagScore(a));
}

const getEffectiveClosedDates = cache(async (): Promise<string[]> => {
  const settings = await getShopSettings();
  const closed = new Set(normalizeClosedDates(settings?.closed_dates ?? []));

  if (!isSupabaseConfigured()) return [...closed];

  const admin = createAdminClient();
  const today = shopDateKey();
  const maxBookableDate = shopDatePlusDays(ORDER_BOOKING_WINDOW_DAYS - 1);

  const { data } = await admin
    .from("delivery_slots")
    .select("slot_date, is_active")
    .gte("slot_date", today)
    .lte("slot_date", maxBookableDate);

  const byDate = new Map<string, boolean[]>();
  for (const row of data ?? []) {
    const d = row.slot_date as string;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(row.is_active as boolean);
  }
  for (const [date, actives] of byDate) {
    if (actives.length > 0 && actives.every((a) => !a)) {
      closed.add(normalizeDateKey(date));
    }
  }
  return [...closed];
});

export const isDeliveryDayClosed = cache(async (date: string): Promise<boolean> => {
  const closed = await getEffectiveClosedDates();
  return closed.includes(normalizeDateKey(date));
});

export interface StorefrontStatus {
  isOpen: boolean;
  bannerMessage: string | null;
}

export const getStorefrontStatus = cache(async (): Promise<StorefrontStatus> => {
  const settings = await getShopSettings();
  const today = shopDateKey();

  if (!settings?.orders_accepting) {
    return {
      isOpen: false,
      bannerMessage: "Store closed — we're not taking orders right now.",
    };
  }

  const slots = await getAvailableDeliverySlots();
  if (slots.length === 0) {
    return {
      isOpen: false,
      bannerMessage: "Store closed — no delivery slots available.",
    };
  }

  if (await isDeliveryDayClosed(today)) {
    return {
      isOpen: true,
      bannerMessage: "Store closed today — order for a later delivery date.",
    };
  }

  return { isOpen: true, bannerMessage: null };
});

async function enrichProductsWithInventory(
  products: Product[],
  deliveryDate?: string,
  options?: { includeLowStockBadge?: boolean }
): Promise<Product[]> {
  if (!products.length) return products;

  const includeLowStockBadge = options?.includeLowStockBadge ?? false;

  const settings = await getShopSettings();
  const closedDates = await getEffectiveClosedDates();
  const nextDate =
    deliveryDate ?? getNextDeliveryDate(closedDates);

  if (!isSupabaseConfigured()) {
    return products.map((p) => ({
      ...p,
      next_delivery_date: nextDate,
      remaining_next_day: 12,
      low_stock: includeLowStockBadge,
      sold_out_today: false,
    }));
  }

  const supabase = await createClient();

  const productIds = products.map((p) => p.id);

  const [{ data: availability }, { data: counts }] = await Promise.all([
    supabase
      .from("product_daily_availability")
      .select("product_id, avail_date, quantity_limit")
      .in("product_id", productIds)
      .eq("avail_date", nextDate),
    supabase
      .from("product_daily_counts")
      .select("product_id, order_count")
      .in("product_id", productIds)
      .eq("count_date", nextDate),
  ]);

  const limitMap = new Map<string, number>();
  for (const row of availability ?? []) {
    limitMap.set(row.product_id as string, row.quantity_limit as number);
  }

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    countMap.set(row.product_id as string, row.order_count as number);
  }

  const availLookup = new Map<string, number>();
  for (const p of products) {
    const key = `${p.id}:${nextDate}`;
    const limit = limitMap.get(p.id) ?? getQuantityLimit(availLookup, p.id, nextDate);
    availLookup.set(key, limit);
  }

  return products.map((p) => {
    const limit = limitMap.get(p.id) ?? getQuantityLimit(availLookup, p.id, nextDate);
    const sold = countMap.get(p.id) ?? 0;
    const remaining = getRemaining(limit, sold);
    return {
      ...p,
      next_delivery_date: nextDate,
      remaining_next_day: remaining,
      low_stock: p.is_active && includeLowStockBadge && showLowStockBadge(remaining),
      sold_out_today: !p.is_active || isSoldOut(remaining),
    };
  });
}

export const getShopSettings = cache(async (): Promise<ShopSettings | null> => {
  if (!isSupabaseConfigured()) return MOCK_SETTINGS;
  const supabase = await createClient();
  const { data } = await supabase.from("shop_settings").select("*").limit(1).single();
  if (!data) return MOCK_SETTINGS;
  const row = data as ShopSettings;
  return {
    ...row,
    closed_dates: normalizeClosedDates(row.closed_dates),
    store_address: row.store_address ?? "",
    fssai_license_no: row.fssai_license_no ?? "",
    phone: row.phone ?? "",
    alt_phone: row.alt_phone ?? "",
    whatsapp_notifications_enabled: row.whatsapp_notifications_enabled ?? true,
  };
});

export async function getDeliveryFeeSlabs(): Promise<DeliveryFeeSlab[]> {
  if (!isSupabaseConfigured()) return MOCK_SLABS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("delivery_fee_slabs")
    .select("*")
    .order("min_km");
  return (data?.length ? data : MOCK_SLABS) as DeliveryFeeSlab[];
}

export async function getProducts(
  includeInactive = false,
  deliveryDate?: string,
  options?: { includeLowStockBadge?: boolean }
): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return enrichProductsWithInventory(MOCK_PRODUCTS, deliveryDate, options);
  }
  const supabase = await createClient();
  const query = supabase.from("products").select("*").order("created_at", { ascending: false });
  const { data: products } = await query;
  if (!products?.length) return [];
  return enrichProductsWithInventory(products as Product[], deliveryDate, options);
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await getProducts(true);
  return products.find((p) => p.id === id) ?? null;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getLandingProducts();
  return products
    .filter(
      (p) =>
        !p.sold_out_today &&
        p.tags.some((t) => t === "bestseller" || t === "must_try")
    )
    .slice(0, 4);
}

export const getHubMarqueeProducts = cache(async (): Promise<HubMarqueeProduct[]> => {
  if (!isSupabaseConfigured()) {
    return sortHubMarqueeProducts(
      MOCK_PRODUCTS.filter((product) => product.is_active).map((product) => ({
        id: product.id,
        title: product.title,
        image_path: product.image_path,
        price_inr: product.price_inr,
        discount_percent: product.discount_percent,
        tags: product.tags,
      }))
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, title, image_path, price_inr, discount_percent, tags, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const active = (data ?? [])
    .filter((row) => row.is_active)
    .map((row) => ({
      id: row.id as string,
      title: row.title as string,
      image_path: row.image_path as string | null,
      price_inr: row.price_inr as number,
      discount_percent: row.discount_percent as number | null,
      tags: (row.tags ?? []) as ProductTag[],
    }));

  return sortHubMarqueeProducts(active);
});

export async function getLandingProducts(): Promise<Product[]> {
  const products = await getProducts();
  const active = products.filter((p) => p.is_active);

  const tagScore = (p: Product) => {
    let s = 0;
    if (p.tags.includes("bestseller")) s += 4;
    if (p.tags.includes("must_try")) s += 3;
    if (p.tags.includes("chef_special")) s += 2;
    if (p.tags.includes("new")) s += 1;
    return s;
  };

  return [...active].sort((a, b) => tagScore(b) - tagScore(a));
}

export const getAvailableDeliverySlots = cache(async (): Promise<DeliverySlot[]> => {
  const closedDates = await getEffectiveClosedDates();

  if (!isSupabaseConfigured()) {
    return filterCustomerDeliverySlots(getMockSlots(), closedDates);
  }

  const supabase = await createClient();
  const today = shopDateKey();
  const maxBookableDate = shopDatePlusDays(ORDER_BOOKING_WINDOW_DAYS - 1);

  const { data } = await supabase
    .from("delivery_slots")
    .select("*")
    .eq("is_active", true)
    .gte("slot_date", today)
    .lte("slot_date", maxBookableDate)
    .order("slot_date")
    .order("window_start");

  return filterCustomerDeliverySlots((data ?? []) as DeliverySlot[], closedDates);
});

export async function getDeliveryModeAvailability() {
  const settings = await getShopSettings();
  const today = shopDateKey();
  const [slots, todayClosed, productsForToday] = await Promise.all([
    getAvailableDeliverySlots(),
    isDeliveryDayClosed(today),
    getProducts(false, today),
  ]);

  return computeDeliveryModeAvailability({
    ordersAccepting: settings?.orders_accepting ?? false,
    todayClosed,
    slots,
    productsForToday,
  });
}

export async function isFirstOrder(phone: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const admin = createAdminClient();
  const { count } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone)
    .eq("payment_status", "paid");
  return (count ?? 0) === 0;
}

export async function getProductsByIds(
  ids: string[],
  deliveryDate?: string
): Promise<Product[]> {
  if (!ids.length) return [];
  if (!isSupabaseConfigured()) {
    return enrichProductsWithInventory(
      MOCK_PRODUCTS.filter((p) => ids.includes(p.id)),
      deliveryDate
    );
  }
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").in("id", ids);
  return enrichProductsWithInventory((data ?? []) as Product[], deliveryDate);
}

export async function checkProductAvailability(
  productId: string,
  quantity: number,
  deliveryDate: string
): Promise<{ ok: boolean; remaining: number; message?: string }> {
  const admin = createAdminClient();

  const { data: avail } = await admin
    .from("product_daily_availability")
    .select("quantity_limit")
    .eq("product_id", productId)
    .eq("avail_date", deliveryDate)
    .single();

  const { data: countRow } = await admin
    .from("product_daily_counts")
    .select("order_count")
    .eq("product_id", productId)
    .eq("count_date", deliveryDate)
    .single();

  const limit = avail?.quantity_limit ?? 20;
  const sold = countRow?.order_count ?? 0;
  const remaining = getRemaining(limit, sold);

  if (quantity > remaining) {
    return {
      ok: false,
      remaining,
      message:
        remaining === 0
          ? "Sold out for this delivery date"
          : `Only ${remaining} left for this date`,
    };
  }
  return { ok: true, remaining };
}

export const getPublishedReviews = cache(async (): Promise<CustomerReview[]> => {
  if (!isSupabaseConfigured()) {
    return MOCK_REVIEWS.filter((r) => r.is_active);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_reviews")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("reviewed_at", { ascending: false });

  return (data ?? []) as CustomerReview[];
});
