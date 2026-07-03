import { subDays, subMinutes, format } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/delivery";
import { normalizeActivityCartItems } from "@/lib/activity-cart";
import { getCachedAdminData } from "@/lib/admin-data-cache";

export type MarketAnalysisPeriod = 7 | 30 | 90;

export const ABANDONMENT_WINDOW_MINUTES = 30;

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  rateFromPrevious: number | null;
}

export interface HeatMapPoint {
  lat: number;
  lng: number;
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  conversionRate: number;
  lostRevenueInr: number;
  topItems: string[];
}

export interface DropOffStage {
  stage: string;
  label: string;
  abandoned: number;
  pctOfAbandoned: number;
}

export interface DemandPocket {
  label: string;
  lat: number;
  lng: number;
  interested: number;
  completed: number;
  conversionRate: number;
  lostRevenueInr: number;
  topItems: string[];
}

export interface DeviceMixMetric {
  deviceType: string;
  label: string;
  sessions: number;
  completed: number;
  conversionRate: number;
}

export interface AbandonedCartItemMetric {
  productId: string;
  title: string;
  totalQuantity: number;
  abandonedSessions: number;
}

export interface MarketAnalysisData {
  period: MarketAnalysisPeriod;
  periodLabel: string;
  kitchenLat: number;
  kitchenLng: number;
  kpis: {
    interestedUsers: number;
    reachedCheckout: number;
    completedOrders: number;
    locationCaptures: number;
    bounceRate: number;
    checkoutCompletionRate: number;
    lostRevenueInr: number;
    repeatMobileLeads: number;
    mobileConversionRate: number;
    averageAbandonedCartValueInr: number;
  };
  funnel: FunnelStage[];
  dropOff: DropOffStage[];
  heatMap: HeatMapPoint[];
  demandPockets: DemandPocket[];
  deviceMix: DeviceMixMetric[];
  abandonedCartItems: AbandonedCartItemMetric[];
  recommendations: string[];
}

interface ActivitySessionRow {
  id: string;
  phone: string | null;
  first_cart_at: string | null;
  phone_verified_at: string | null;
  location_marked_at: string | null;
  checkout_started_at: string | null;
  order_created_at: string | null;
  order_completed_at: string | null;
  is_order_completed: boolean;
  last_stage: string;
  lat: number | null;
  lng: number | null;
  cart_value_inr: number | null;
  cart_items: unknown;
  device_type: string | null;
  updated_at: string;
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
  bot: "Bot",
  unknown: "Unknown",
};

function roundCoord(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function isAbandoned(session: ActivitySessionRow, cutoff: Date): boolean {
  if (session.is_order_completed) return false;
  const reachedIntent =
    session.checkout_started_at != null || session.location_marked_at != null;
  if (!reachedIntent) return false;
  return new Date(session.updated_at) < cutoff;
}

function clusterKey(lat: number, lng: number): string {
  return `${roundCoord(lat)}:${roundCoord(lng)}`;
}

function topItemNamesFromSessions(
  sessions: ActivitySessionRow[],
  limit = 3
): string[] {
  const counts = new Map<string, number>();

  for (const session of sessions) {
    for (const item of normalizeActivityCartItems(session.cart_items)) {
      const title = item.title ?? item.productId;
      counts.set(title, (counts.get(title) ?? 0) + item.quantity);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([title]) => title);
}

function buildRecommendations(data: {
  bounceRate: number;
  checkoutCompletionRate: number;
  funnel: FunnelStage[];
  demandPockets: DemandPocket[];
  locationCaptures: number;
  interestedUsers: number;
  repeatMobileLeads: number;
  abandonedCartItems: AbandonedCartItemMetric[];
}): string[] {
  const insights: string[] = [];

  if (data.interestedUsers === 0) {
    insights.push(
      "No checkout activity recorded yet. Once customers add items and verify phone numbers, funnel data will appear here."
    );
    return insights;
  }

  const phoneStage = data.funnel.find((f) => f.stage === "phone_verified");
  const cartStage = data.funnel.find((f) => f.stage === "cart");
  const locationStage = data.funnel.find((f) => f.stage === "location");
  const checkoutStage = data.funnel.find((f) => f.stage === "checkout");

  if (phoneStage && cartStage && phoneStage.rateFromPrevious != null && phoneStage.rateFromPrevious < 60) {
    insights.push(
      `Only ${phoneStage.rateFromPrevious}% of cart users verify their phone. Consider simplifying OTP or adding a WhatsApp reminder at cart.`
    );
  }

  if (
    locationStage &&
    phoneStage &&
    locationStage.rateFromPrevious != null &&
    locationStage.rateFromPrevious < 70
  ) {
    insights.push(
      "Many verified users drop off before marking location. Review delivery area messaging and location picker UX."
    );
  }

  if (
    checkoutStage &&
    locationStage &&
    checkoutStage.rateFromPrevious != null &&
    checkoutStage.rateFromPrevious < 75
  ) {
    insights.push(
      "Location is set but checkout is not reached for a meaningful share of users. Check delivery fees and slot availability at the location step."
    );
  }

  if (data.bounceRate >= 40) {
    insights.push(
      `${data.bounceRate}% of users who reach location or checkout leave without ordering. Retargeting campaigns or limited-time offers may help recover intent.`
    );
  } else if (data.checkoutCompletionRate >= 60) {
    insights.push(
      `Strong checkout completion at ${data.checkoutCompletionRate}%. Focus marketing on driving more users into the funnel.`
    );
  }

  if (data.repeatMobileLeads >= 3) {
    insights.push(
      `${data.repeatMobileLeads} mobile numbers returned during this period. These are warm leads worth a WhatsApp follow-up with their latest cart items.`
    );
  }

  const hotLowConvert = data.demandPockets.find(
    (p) => p.interested >= 3 && p.conversionRate < 40
  );
  if (hotLowConvert) {
    insights.push(
      `High interest near ${hotLowConvert.label} (${hotLowConvert.interested} sessions) but only ${hotLowConvert.conversionRate}% convert. Test localized offers or delivery fee promos in this area.`
    );
  }

  if (data.abandonedCartItems[0]) {
    insights.push(
      `${data.abandonedCartItems[0].title} is the most common abandoned cart item. Consider a reminder campaign featuring it.`
    );
  }

  if (data.locationCaptures > 0 && data.locationCaptures / data.interestedUsers >= 0.5) {
    insights.push(
      "Location data is healthy — use the heat map to plan delivery zone expansion or targeted WhatsApp campaigns by neighborhood."
    );
  }

  if (insights.length === 0) {
    insights.push(
      "Funnel looks balanced for the selected period. Keep monitoring bounce rate as order volume grows."
    );
  }

  return insights.slice(0, 6);
}

export async function fetchMarketAnalysis(
  period: MarketAnalysisPeriod = 30
): Promise<MarketAnalysisData> {
  return getCachedAdminData(`market-analysis-${period}`, () =>
    fetchMarketAnalysisUncached(period)
  );
}

async function fetchMarketAnalysisUncached(
  period: MarketAnalysisPeriod = 30
): Promise<MarketAnalysisData> {
  const admin = createAdminClient();
  const now = new Date();
  const periodStart = subDays(now, period);
  const abandonmentCutoff = subMinutes(now, ABANDONMENT_WINDOW_MINUTES);

  const [{ data: sessions }, { data: shop }] = await Promise.all([
      admin
        .from("customer_activity_sessions")
        .select(
          "id, phone, first_cart_at, phone_verified_at, location_marked_at, checkout_started_at, order_created_at, order_completed_at, is_order_completed, last_stage, lat, lng, cart_value_inr, cart_items, device_type, updated_at"
        )
        .gte("created_at", periodStart.toISOString()),
      admin.from("shop_settings").select("kitchen_lat, kitchen_lng").limit(1).single(),
    ]);

  const rows = (sessions ?? []) as ActivitySessionRow[];

  const interestedUsers = rows.filter((r) => r.first_cart_at != null).length;
  const phoneVerified = rows.filter((r) => r.phone_verified_at != null).length;
  const locationMarked = rows.filter((r) => r.location_marked_at != null).length;
  const checkoutStarted = rows.filter((r) => r.checkout_started_at != null).length;
  const orderCreated = rows.filter((r) => r.order_created_at != null).length;
  const completedOrders = rows.filter((r) => r.is_order_completed).length;

  const abandonedSessions = rows.filter((r) => isAbandoned(r, abandonmentCutoff));
  const reachedIntent = rows.filter(
    (r) => r.checkout_started_at != null || r.location_marked_at != null
  );
  const bounceRate =
    reachedIntent.length > 0
      ? Math.round((abandonedSessions.length / reachedIntent.length) * 100)
      : 0;

  const checkoutCompletionRate =
    checkoutStarted > 0
      ? Math.round((completedOrders / checkoutStarted) * 100)
      : 0;

  const lostRevenueInr = abandonedSessions.reduce(
    (sum, r) => sum + (r.cart_value_inr ?? 0),
    0
  );

  const averageAbandonedCartValueInr =
    abandonedSessions.length > 0
      ? Math.round(lostRevenueInr / abandonedSessions.length)
      : 0;

  const phonesInPeriod = rows
    .map((r) => r.phone)
    .filter(Boolean) as string[];
  const phoneCounts = new Map<string, number>();
  for (const phone of phonesInPeriod) {
    phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
  }
  const repeatMobileLeads = [...phoneCounts.values()].filter((count) => count > 1).length;

  const stageCounts = [
    { stage: "cart", label: "Added to cart", count: interestedUsers },
    { stage: "phone_verified", label: "Phone verified", count: phoneVerified },
    { stage: "location", label: "Location marked", count: locationMarked },
    { stage: "checkout", label: "Reached checkout", count: checkoutStarted },
    { stage: "order_created", label: "Order created", count: orderCreated },
    { stage: "completed", label: "Order completed", count: completedOrders },
  ];

  const funnel: FunnelStage[] = stageCounts.map((item, index) => {
    const prev = index > 0 ? stageCounts[index - 1].count : null;
    return {
      ...item,
      rateFromPrevious:
        prev != null && prev > 0
          ? Math.round((item.count / prev) * 100)
          : index === 0
            ? null
            : 0,
    };
  });

  const dropOffCounts: Record<string, number> = {
    phone_verified: 0,
    location: 0,
    checkout: 0,
    order_created: 0,
  };

  for (const session of abandonedSessions) {
    if (session.order_created_at && !session.is_order_completed) {
      dropOffCounts.order_created += 1;
    } else if (session.checkout_started_at) {
      dropOffCounts.checkout += 1;
    } else if (session.location_marked_at) {
      dropOffCounts.location += 1;
    } else if (session.phone_verified_at) {
      dropOffCounts.phone_verified += 1;
    }
  }

  const totalAbandoned = abandonedSessions.length;
  const dropOffLabels: Record<string, string> = {
    phone_verified: "After phone verification",
    location: "After location selection",
    checkout: "At checkout",
    order_created: "After order created (unpaid)",
  };

  const dropOff: DropOffStage[] = Object.entries(dropOffCounts)
    .filter(([, count]) => count > 0)
    .map(([stage, abandoned]) => ({
      stage,
      label: dropOffLabels[stage] ?? stage,
      abandoned,
      pctOfAbandoned:
        totalAbandoned > 0 ? Math.round((abandoned / totalAbandoned) * 100) : 0,
    }))
    .sort((a, b) => b.abandoned - a.abandoned);

  const clusterMap = new Map<
    string,
    {
      lat: number;
      lng: number;
      total: number;
      completed: number;
      abandoned: number;
      lostRevenue: number;
      sessions: ActivitySessionRow[];
    }
  >();

  for (const session of rows) {
    if (session.lat == null || session.lng == null) continue;
    const lat = roundCoord(session.lat);
    const lng = roundCoord(session.lng);
    const key = clusterKey(lat, lng);
    const existing = clusterMap.get(key) ?? {
      lat,
      lng,
      total: 0,
      completed: 0,
      abandoned: 0,
      lostRevenue: 0,
      sessions: [],
    };
    existing.total += 1;
    existing.sessions.push(session);
    if (session.is_order_completed) existing.completed += 1;
    if (isAbandoned(session, abandonmentCutoff)) {
      existing.abandoned += 1;
      existing.lostRevenue += session.cart_value_inr ?? 0;
    }
    clusterMap.set(key, existing);
  }

  const heatMap: HeatMapPoint[] = [...clusterMap.values()]
    .map((c) => ({
      lat: c.lat,
      lng: c.lng,
      totalSessions: c.total,
      completedSessions: c.completed,
      abandonedSessions: c.abandoned,
      conversionRate:
        c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0,
      lostRevenueInr: c.lostRevenue,
      topItems: topItemNamesFromSessions(c.sessions),
    }))
    .sort((a, b) => b.totalSessions - a.totalSessions);

  const demandPockets: DemandPocket[] = [...clusterMap.values()]
    .map((c) => ({
      label: `${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}`,
      lat: c.lat,
      lng: c.lng,
      interested: c.total,
      completed: c.completed,
      conversionRate:
        c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0,
      lostRevenueInr: c.lostRevenue,
      topItems: topItemNamesFromSessions(c.sessions),
    }))
    .sort((a, b) => b.interested - a.interested)
    .slice(0, 8);

  const deviceMap = new Map<
    string,
    { sessions: number; completed: number }
  >();

  for (const session of rows) {
    const device = session.device_type ?? "unknown";
    const existing = deviceMap.get(device) ?? { sessions: 0, completed: 0 };
    existing.sessions += 1;
    if (session.is_order_completed) existing.completed += 1;
    deviceMap.set(device, existing);
  }

  const deviceMix: DeviceMixMetric[] = [...deviceMap.entries()]
    .map(([deviceType, stats]) => ({
      deviceType,
      label: DEVICE_LABELS[deviceType] ?? deviceType,
      sessions: stats.sessions,
      completed: stats.completed,
      conversionRate:
        stats.sessions > 0
          ? Math.round((stats.completed / stats.sessions) * 100)
          : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const mobileStats = deviceMap.get("mobile");
  const mobileConversionRate = mobileStats
    ? mobileStats.sessions > 0
      ? Math.round((mobileStats.completed / mobileStats.sessions) * 100)
      : 0
    : 0;

  const abandonedItemMap = new Map<
    string,
    { title: string; totalQuantity: number; abandonedSessions: number }
  >();

  for (const session of abandonedSessions) {
    const items = normalizeActivityCartItems(session.cart_items);
    if (items.length === 0) continue;

    for (const item of items) {
      const existing = abandonedItemMap.get(item.productId) ?? {
        title: item.title ?? item.productId,
        totalQuantity: 0,
        abandonedSessions: 0,
      };
      existing.totalQuantity += item.quantity;
      existing.abandonedSessions += 1;
      abandonedItemMap.set(item.productId, existing);
    }
  }

  const abandonedCartItems: AbandonedCartItemMetric[] = [...abandonedItemMap.entries()]
    .map(([productId, stats]) => ({
      productId,
      title: stats.title,
      totalQuantity: stats.totalQuantity,
      abandonedSessions: stats.abandonedSessions,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 6);

  const recommendations = buildRecommendations({
    bounceRate,
    checkoutCompletionRate,
    funnel,
    demandPockets,
    locationCaptures: locationMarked,
    interestedUsers,
    repeatMobileLeads,
    abandonedCartItems,
  });

  return {
    period,
    periodLabel: `${format(periodStart, "d MMM")} – ${format(now, "d MMM yyyy")}`,
    kitchenLat: shop?.kitchen_lat ?? 12.9716,
    kitchenLng: shop?.kitchen_lng ?? 77.5946,
    kpis: {
      interestedUsers,
      reachedCheckout: checkoutStarted,
      completedOrders,
      locationCaptures: locationMarked,
      bounceRate,
      checkoutCompletionRate,
      lostRevenueInr,
      repeatMobileLeads,
      mobileConversionRate,
      averageAbandonedCartValueInr,
    },
    funnel,
    dropOff,
    heatMap,
    demandPockets,
    deviceMix,
    abandonedCartItems,
    recommendations,
  };
}

export function formatMarketCurrency(value: number): string {
  return formatCurrency(value);
}
