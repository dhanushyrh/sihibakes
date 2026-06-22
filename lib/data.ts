import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeliveryFeeSlab, DeliverySlot, Product, ShopSettings, CustomerReview } from "@/lib/types";
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
import { filterCustomerDeliverySlots } from "@/lib/customer-delivery-slots";

async function getEffectiveClosedDates(): Promise<string[]> {
  const settings = await getShopSettings();
  const closed = new Set(normalizeClosedDates(settings?.closed_dates ?? []));

  if (!isSupabaseConfigured()) return [...closed];

  const admin = createAdminClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const twoWeeks = format(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const { data } = await admin
    .from("delivery_slots")
    .select("slot_date, is_active")
    .gte("slot_date", today)
    .lte("slot_date", twoWeeks);

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
}

export async function isDeliveryDayClosed(date: string): Promise<boolean> {
  const closed = await getEffectiveClosedDates();
  return closed.includes(normalizeDateKey(date));
}

export interface StorefrontStatus {
  isOpen: boolean;
  bannerMessage: string | null;
}

export async function getStorefrontStatus(): Promise<StorefrontStatus> {
  const settings = await getShopSettings();
  const today = format(new Date(), "yyyy-MM-dd");

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
}

async function enrichProductsWithInventory(
  products: Product[],
  deliveryDate?: string
): Promise<Product[]> {
  if (!products.length) return products;

  const settings = await getShopSettings();
  const closedDates = await getEffectiveClosedDates();
  const nextDate =
    deliveryDate ?? getNextDeliveryDate(closedDates);

  if (!isSupabaseConfigured()) {
    return products.map((p) => ({
      ...p,
      next_delivery_date: nextDate,
      remaining_next_day: 12,
      low_stock: true,
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
      low_stock: p.is_active && showLowStockBadge(remaining),
      sold_out_today: !p.is_active || isSoldOut(remaining),
    };
  });
}

export async function getShopSettings(): Promise<ShopSettings | null> {
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
  };
}

export async function getDeliveryFeeSlabs(): Promise<DeliveryFeeSlab[]> {
  if (!isSupabaseConfigured()) return MOCK_SLABS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("delivery_fee_slabs")
    .select("*")
    .order("min_km");
  return (data?.length ? data : MOCK_SLABS) as DeliveryFeeSlab[];
}

export async function getProducts(includeInactive = false): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return enrichProductsWithInventory(MOCK_PRODUCTS);
  }
  const supabase = await createClient();
  const query = supabase.from("products").select("*").order("created_at", { ascending: false });
  const { data: products } = await query;
  if (!products?.length) return [];
  return enrichProductsWithInventory(products as Product[]);
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

export async function getAvailableDeliverySlots(): Promise<DeliverySlot[]> {
  const closedDates = await getEffectiveClosedDates();

  if (!isSupabaseConfigured()) {
    return filterCustomerDeliverySlots(getMockSlots(), closedDates);
  }

  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const twoWeeks = format(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const { data } = await supabase
    .from("delivery_slots")
    .select("*")
    .eq("is_active", true)
    .gte("slot_date", today)
    .lte("slot_date", twoWeeks)
    .order("slot_date")
    .order("window_start");

  return filterCustomerDeliverySlots((data ?? []) as DeliverySlot[], closedDates);
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

export async function getPublishedReviews(): Promise<CustomerReview[]> {
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
}
