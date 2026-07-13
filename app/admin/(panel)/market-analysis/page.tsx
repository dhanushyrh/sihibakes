import {
  fetchMarketAnalysis,
  type MarketAnalysisPeriod,
} from "@/lib/market-analysis";
import { formatCurrency } from "@/lib/delivery";
import { isSupabaseConfigured } from "@/lib/mock-data";
import { MetricCard } from "@/components/admin/analytics/MetricCard";
import { MarketAnalysisPeriodTabs } from "@/components/admin/market-analysis/MarketAnalysisPeriodTabs";
import { FunnelChart } from "@/components/admin/market-analysis/FunnelChart";
import { LocationHeatMap } from "@/components/admin/market-analysis/LocationHeatMapLazy";
import { DropOffPanel } from "@/components/admin/market-analysis/DropOffPanel";
import { DemandPocketsTable } from "@/components/admin/market-analysis/DemandPocketsTable";
import { MarketingRecommendations } from "@/components/admin/market-analysis/MarketingRecommendations";
import { DeviceMixPanel } from "@/components/admin/market-analysis/DeviceMixPanel";
import { AbandonedCartItemsPanel } from "@/components/admin/market-analysis/AbandonedCartItemsPanel";
import { LocationCaptureLeadsTable } from "@/components/admin/market-analysis/LocationCaptureLeadsTable";
import {
  Users,
  MapPin,
  ShoppingCart,
  CheckCircle2,
  TrendingDown,
  Repeat,
} from "lucide-react";

function parsePeriod(raw: string | undefined): MarketAnalysisPeriod {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

export default async function MarketAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[#4B2C20]">
          Market Analysis
        </h1>
        <p className="mt-4 text-sm text-[#4B2C20]/60">
          Connect Supabase to view market analysis.
        </p>
      </div>
    );
  }

  const data = await fetchMarketAnalysis(period);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#4B2C20]">
            Market Analysis
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">{data.periodLabel}</p>
          <p className="mt-1 text-xs text-[#4B2C20]/45">
            Track customer intent from cart to checkout — including users who
            leave before ordering.
          </p>
        </div>
        <MarketAnalysisPeriodTabs current={period} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Interested users"
          value={String(data.kpis.interestedUsers)}
          subtitle="Added to cart"
          icon={Users}
        />
        <MetricCard
          label="Location captures"
          value={String(data.kpis.locationCaptures)}
          subtitle="Pinned delivery spot · see leads below"
          icon={MapPin}
        />
        <MetricCard
          label="Reached checkout"
          value={String(data.kpis.reachedCheckout)}
          subtitle={`${data.kpis.checkoutCompletionRate}% complete`}
          icon={ShoppingCart}
        />
        <MetricCard
          label="Completed orders"
          value={String(data.kpis.completedOrders)}
          subtitle="Paid & confirmed"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Repeat mobile leads"
          value={String(data.kpis.repeatMobileLeads)}
          subtitle="Latest profile kept per phone"
          icon={Repeat}
        />
        <MetricCard
          label="Bounce rate"
          value={`${data.kpis.bounceRate}%`}
          subtitle={`${formatCurrency(data.kpis.lostRevenueInr)} lost intent`}
          icon={TrendingDown}
        />
      </div>

      <LocationCaptureLeadsTable leads={data.locationCaptureLeads} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <FunnelChart stages={data.funnel} />
        </div>
        <DropOffPanel
          stages={data.dropOff}
          bounceRate={data.kpis.bounceRate}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <LocationHeatMap
          points={data.heatMap}
          kitchenLat={data.kitchenLat}
          kitchenLng={data.kitchenLng}
        />
        <MarketingRecommendations recommendations={data.recommendations} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DeviceMixPanel
          devices={data.deviceMix}
          mobileConversionRate={data.kpis.mobileConversionRate}
        />
        <AbandonedCartItemsPanel
          items={data.abandonedCartItems}
          averageCartValueInr={data.kpis.averageAbandonedCartValueInr}
        />
      </div>

      <DemandPocketsTable pockets={data.demandPockets} />
    </div>
  );
}
