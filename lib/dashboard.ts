import { subDays } from "date-fns";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnacknowledgedAlerts } from "@/lib/alerts/notify-admin";
import { getTodayDate, getRemaining, LOW_STOCK_THRESHOLD, DEFAULT_DAILY_QUANTITY } from "@/lib/inventory";
import type { Product } from "@/lib/types";

export type DashboardProduct = Pick<
  Product,
  "id" | "title" | "price_inr" | "image_path" | "is_active"
>;

export type DashboardStats = {
  todayOrderCount: number;
  todayRevenue: number;
  pendingCount: number;
};

export type DashboardProductRow = {
  product: DashboardProduct;
  orderCount: number;
};

export type DashboardLowStockProduct = {
  id: string;
  title: string;
};

async function getProductOrderCounts(
  admin: SupabaseClient,
  since: string
): Promise<Map<string, number>> {
  const { data, error } = await admin.rpc("get_product_order_counts", {
    since,
  });

  if (error) {
    const { data: orderItems } = await admin
      .from("order_items")
      .select("product_id, quantity, orders!inner(payment_status, created_at)")
      .eq("orders.payment_status", "paid")
      .gte("orders.created_at", since);

    const counts = new Map<string, number>();
    for (const item of orderItems ?? []) {
      const pid = item.product_id as string;
      counts.set(pid, (counts.get(pid) ?? 0) + (item.quantity as number));
    }
    return counts;
  }

  return new Map(
    (data ?? []).map((row: { product_id: string; units: number }) => [
      row.product_id,
      Number(row.units),
    ])
  );
}

export const fetchDashboardAlerts = cache(async () => {
  return getUnacknowledgedAlerts(5);
});

export const fetchDashboardStats = cache(async (): Promise<DashboardStats> => {
  const admin = createAdminClient();
  const today = getTodayDate();

  const [{ data: todayOrders }, { count: pendingCount }] = await Promise.all([
    admin
      .from("orders")
      .select("total_inr")
      .gte("created_at", `${today}T00:00:00`)
      .eq("payment_status", "paid"),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("payment_status", "paid"),
  ]);

  const todayRevenue = (todayOrders ?? []).reduce(
    (sum, order) => sum + (order.total_inr as number),
    0
  );

  return {
    todayOrderCount: todayOrders?.length ?? 0,
    todayRevenue,
    pendingCount: pendingCount ?? 0,
  };
});

export const fetchDashboardProducts = cache(async (): Promise<{
  productsWithOrders: DashboardProductRow[];
  totalUnits30d: number;
  lowStock: DashboardLowStockProduct[];
}> => {
  const admin = createAdminClient();
  const today = getTodayDate();
  const since = subDays(new Date(), 30).toISOString();

  const [
    { data: products },
    orderCounts,
    { data: availability },
    { data: counts },
  ] = await Promise.all([
    admin
      .from("products")
      .select("id, title, price_inr, image_path, is_active")
      .order("title"),
    getProductOrderCounts(admin, since),
    admin
      .from("product_daily_availability")
      .select("product_id, quantity_limit")
      .eq("avail_date", today),
    admin
      .from("product_daily_counts")
      .select("product_id, order_count")
      .eq("count_date", today),
  ]);

  const limitMap = new Map(
    (availability ?? []).map((a) => [a.product_id, a.quantity_limit as number])
  );
  const countMap = new Map(
    (counts ?? []).map((c) => [c.product_id, c.order_count as number])
  );

  const productList = (products ?? []) as DashboardProduct[];

  const lowStock = productList
    .filter((p) => {
      const limit = limitMap.get(p.id) ?? DEFAULT_DAILY_QUANTITY;
      const sold = countMap.get(p.id) ?? 0;
      const remaining = getRemaining(limit, sold);
      return remaining > 0 && remaining <= LOW_STOCK_THRESHOLD;
    })
    .map((p) => ({ id: p.id, title: p.title }));

  const productsWithOrders = productList
    .map((product) => ({
      product,
      orderCount: orderCounts.get(product.id) ?? 0,
    }))
    .sort((a, b) => b.orderCount - a.orderCount);

  const totalUnits30d = productsWithOrders.reduce(
    (sum, row) => sum + row.orderCount,
    0
  );

  return { productsWithOrders, totalUnits30d, lowStock };
});

export function buildDashboardInsights(params: {
  todayOrderCount: number;
  pendingCount: number;
  totalUnits30d: number;
  topProduct?: DashboardProductRow;
  lowStockCount: number;
}): string[] {
  const insights: string[] = [];

  if (params.todayOrderCount === 0) {
    insights.push(
      "No paid orders yet today. Share your menu link or promote FIRST59 for first-time customers."
    );
  } else {
    insights.push(
      `${params.todayOrderCount} paid order${params.todayOrderCount === 1 ? "" : "s"} today — check revenue in the stats above.`
    );
  }

  if (params.pendingCount > 0) {
    insights.push(
      `${params.pendingCount} order${params.pendingCount === 1 ? " is" : "s are"} awaiting confirmation — confirm them to keep delivery on schedule.`
    );
  }

  if (params.topProduct && params.topProduct.orderCount > 0) {
    insights.push(
      `${params.topProduct.product.title} leads with ${params.topProduct.orderCount} units in the last 30 days — consider featuring it on the homepage.`
    );
  }

  if (params.lowStockCount > 0) {
    insights.push(
      `${params.lowStockCount} product${params.lowStockCount === 1 ? "" : "s"} near low stock today — review limits on the Delivery & Stock page.`
    );
  }

  if (insights.length < 3) {
    insights.push(
      "View full trends, repeat customers, and delivery slots on the Analytics page."
    );
  }

  return insights.slice(0, 4);
}
