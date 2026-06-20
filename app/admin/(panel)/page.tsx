import Image from "next/image";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAnalytics } from "@/lib/analytics";
import { formatCurrency } from "@/lib/delivery";
import { format, subDays } from "date-fns";
import { isSupabaseConfigured } from "@/lib/mock-data";
import { getTodayDate, getRemaining, LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { InsightsPanel } from "@/components/admin/analytics/InsightsPanel";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getProductOrderCounts(admin: ReturnType<typeof createAdminClient>) {
  const since = subDays(new Date(), 30).toISOString();

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

export default async function AdminDashboard() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div>
        <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">Dashboard</h1>
        <p className="mt-4 text-sm text-[#4B2C20]/60">
          Connect Supabase to view live dashboard data. Add env vars from .env.example.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const today = getTodayDate();

  const [
    { data: todayOrders },
    { data: products },
    { count: pendingCount },
    orderCounts,
    { data: availability },
    { data: counts },
    analytics,
  ] = await Promise.all([
    admin
      .from("orders")
      .select("*")
      .gte("created_at", `${today}T00:00:00`)
      .eq("payment_status", "paid"),
    admin.from("products").select("*").order("title"),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
      .eq("payment_status", "paid"),
    getProductOrderCounts(admin),
    admin
      .from("product_daily_availability")
      .select("product_id, quantity_limit")
      .eq("avail_date", today),
    admin
      .from("product_daily_counts")
      .select("product_id, order_count")
      .eq("count_date", today),
    fetchAnalytics(30),
  ]);

  const revenue = (todayOrders ?? []).reduce(
    (s, o) => s + (o.total_inr as number),
    0
  );

  const limitMap = new Map(
    (availability ?? []).map((a) => [a.product_id, a.quantity_limit as number])
  );
  const countMap = new Map(
    (counts ?? []).map((c) => [c.product_id, c.order_count as number])
  );

  const productList = (products ?? []) as Product[];
  const lowStock = productList.filter((p) => {
    const limit = limitMap.get(p.id) ?? 20;
    const sold = countMap.get(p.id) ?? 0;
    const remaining = getRemaining(limit, sold);
    return remaining > 0 && remaining <= LOW_STOCK_THRESHOLD;
  });

  const productsWithOrders = productList
    .map((p) => ({
      product: p,
      orderCount: orderCounts.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.orderCount - a.orderCount);

  const totalUnits30d = productsWithOrders.reduce((s, p) => s + p.orderCount, 0);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-[#4B2C20]/60">
        {format(new Date(), "EEEE, d MMMM yyyy")}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Today's Orders", value: String(todayOrders?.length ?? 0) },
          { label: "Today's Revenue", value: formatCurrency(revenue) },
          { label: "Pending Orders", value: String(pendingCount ?? 0) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10"
          >
            <p className="text-xs text-[#4B2C20]/50">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#4B2C20]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <InsightsPanel insights={analytics.insights} />
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#4B2C20]">Products</h2>
            <p className="mt-0.5 text-sm text-[#4B2C20]/60">
              Units sold in the last 30 days · {totalUnits30d} total
            </p>
          </div>
          <Link
            href="/admin/products"
            className="text-sm font-medium text-[#4B2C20] underline-offset-4 hover:underline"
          >
            Manage products
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productsWithOrders.length === 0 ? (
            <p className="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-[#4B2C20]/50 ring-1 ring-[#4B2C20]/10">
              No products yet.
            </p>
          ) : (
            productsWithOrders.map(({ product, orderCount }) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10"
              >
                <div className="relative aspect-[16/10] bg-[#F5E6D3]">
                  <Image
                    src={product.image_path || "/hero-tiramisu.png"}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  {!product.is_active && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-[#4B2C20]">{product.title}</h3>
                  <p className="mt-0.5 text-xs text-[#4B2C20]/50">
                    {formatCurrency(product.price_inr)}
                  </p>
                  <div className="mt-4 flex items-end justify-between border-t border-[#4B2C20]/10 pt-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#4B2C20]/40">
                      30-day orders
                    </p>
                    <p className="text-2xl font-semibold tabular-nums text-[#4B2C20]">
                      {orderCount}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {lowStock.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-medium text-amber-800">
            Near low stock today
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {lowStock.map((p) => (
              <li key={p.id}>{p.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
