import { fetchAnalytics, type AnalyticsPeriod } from "@/lib/analytics";
import { formatCurrency } from "@/lib/delivery";
import { isSupabaseConfigured } from "@/lib/mock-data";
import { MetricCard } from "@/components/admin/analytics/MetricCard";
import { PeriodTabs } from "@/components/admin/analytics/PeriodTabs";
import { SimpleBarChart } from "@/components/admin/analytics/SimpleBarChart";
import { RevenueTrendChart } from "@/components/admin/analytics/RevenueTrendChart";
import { TopProductsChart } from "@/components/admin/analytics/TopProductsChart";
import { OrderStatusBreakdown } from "@/components/admin/analytics/OrderStatusBreakdown";
import { CouponPerformance } from "@/components/admin/analytics/CouponPerformance";
import { CustomerSplit } from "@/components/admin/analytics/CustomerSplit";
import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  MapPin,
  Percent,
} from "lucide-react";

export const dynamic = "force-dynamic";

function parsePeriod(raw: string | undefined): AnalyticsPeriod {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[#4B2C20]">Analytics</h1>
        <p className="mt-4 text-sm text-[#4B2C20]/60">
          Connect Supabase to view analytics.
        </p>
      </div>
    );
  }

  const data = await fetchAnalytics(period);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#4B2C20]">Analytics</h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">{data.periodLabel}</p>
        </div>
        <PeriodTabs current={period} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={formatCurrency(data.kpis.revenue)}
          change={data.kpis.revenueChange}
          icon={IndianRupee}
        />
        <MetricCard
          label="Orders"
          value={String(data.kpis.orders)}
          change={data.kpis.ordersChange}
          icon={ShoppingBag}
        />
        <MetricCard
          label="Avg order value"
          value={formatCurrency(data.kpis.aov)}
          change={data.kpis.aovChange}
          icon={TrendingUp}
        />
        <MetricCard
          label="Avg delivery"
          value={`${data.kpis.avgDeliveryKm.toFixed(1)} km`}
          subtitle={`${data.kpis.cancellationRate}% cancelled`}
          icon={MapPin}
        />
      </div>

      <RevenueTrendChart
        data={data.dailyTrend.map((d) => ({
          label: d.label,
          revenue: d.revenue,
          orders: d.orders,
        }))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleBarChart
          title="Orders by day"
          subtitle="Which days drive volume"
          data={data.ordersByDayOfWeek.map((d) => ({
            label: d.day,
            value: d.orders,
          }))}
        />
        <SimpleBarChart
          title="Delivery windows"
          subtitle="Preferred time slots"
          data={data.deliverySlots.map((d) => ({
            label: d.window,
            value: d.orders,
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <TopProductsChart products={data.topProducts} />
        <CustomerSplit
          firstTime={data.kpis.firstTimeCustomers}
          repeat={data.kpis.repeatCustomers}
          repeatRate={data.kpis.repeatRate}
        />
        <OrderStatusBreakdown data={data.orderStatus} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CouponPerformance
          coupons={data.coupons}
          totalDiscount={data.kpis.totalDiscount}
        />
        <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-[#4B2C20]/40" />
            <h3 className="text-sm font-semibold text-[#4B2C20]">
              Quick stats
            </h3>
          </div>
          <dl className="mt-4 space-y-3">
            {[
              {
                label: "Discounts given",
                value: formatCurrency(data.kpis.totalDiscount),
              },
              {
                label: "Revenue after discounts",
                value: formatCurrency(
                  data.kpis.revenue
                ),
              },
              {
                label: "Orders per day (avg)",
                value:
                  data.dailyTrend.length > 0
                    ? (
                        data.kpis.orders / data.dailyTrend.length
                      ).toFixed(1)
                    : "0",
              },
              {
                label: "Best product (units)",
                value:
                  data.topProducts[0]?.title ?? "—",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-[#4B2C20]/5 pb-2 last:border-0"
              >
                <dt className="text-xs text-[#4B2C20]/50">{row.label}</dt>
                <dd className="text-sm font-medium text-[#4B2C20]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
