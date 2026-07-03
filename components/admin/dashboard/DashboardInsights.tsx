import Link from "next/link";
import {
  buildDashboardInsights,
  fetchDashboardProducts,
  fetchDashboardStats,
} from "@/lib/dashboard";
import { InsightsPanel } from "@/components/admin/analytics/InsightsPanel";

export async function DashboardInsights() {
  const [stats, { productsWithOrders, lowStock }] = await Promise.all([
    fetchDashboardStats(),
    fetchDashboardProducts(),
  ]);

  const topProduct = productsWithOrders.find((row) => row.orderCount > 0);
  const insights = buildDashboardInsights({
    todayOrderCount: stats.todayOrderCount,
    pendingCount: stats.pendingCount,
    totalUnits30d: productsWithOrders.reduce(
      (sum, row) => sum + row.orderCount,
      0
    ),
    topProduct,
    lowStockCount: lowStock.length,
  });

  return (
    <section className="mt-6">
      <InsightsPanel insights={insights} />
      <p className="mt-3 text-xs text-[#4B2C20]/50">
        <Link
          href="/admin/analytics"
          className="font-medium text-[#4B2C20]/70 underline-offset-4 hover:underline"
        >
          Open Analytics
        </Link>{" "}
        for revenue trends, repeat customers, and delivery slot breakdowns.
      </p>
    </section>
  );
}
