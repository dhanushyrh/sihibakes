import {
  format,
  subDays,
  eachDayOfInterval,
  getDay,
  parseISO,
} from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/delivery";

export type AnalyticsPeriod = 7 | 30 | 90;

export interface DailyMetric {
  date: string;
  label: string;
  orders: number;
  revenue: number;
}

export interface ProductMetric {
  productId: string;
  title: string;
  imagePath: string | null;
  units: number;
  revenue: number;
}

export interface CouponMetric {
  code: string;
  uses: number;
  discountGiven: number;
}

export interface SlotMetric {
  window: string;
  orders: number;
}

export interface AnalyticsData {
  period: AnalyticsPeriod;
  periodLabel: string;
  kpis: {
    revenue: number;
    revenueChange: number;
    orders: number;
    ordersChange: number;
    aov: number;
    aovChange: number;
    firstTimeCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
    avgDeliveryKm: number;
    totalDiscount: number;
    cancellationRate: number;
  };
  dailyTrend: DailyMetric[];
  topProducts: ProductMetric[];
  ordersByDayOfWeek: { day: string; orders: number }[];
  deliverySlots: SlotMetric[];
  orderStatus: { status: string; count: number }[];
  coupons: CouponMetric[];
  insights: string[];
}

interface OrderRow {
  id: string;
  total_inr: number;
  discount_inr: number;
  distance_km: number;
  phone: string;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_window_start: string;
  coupon_id: string | null;
  coupons?: { code: string } | null;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function fetchAnalytics(
  period: AnalyticsPeriod = 30
): Promise<AnalyticsData> {
  const admin = createAdminClient();
  const now = new Date();
  const periodStart = subDays(now, period);
  const priorStart = subDays(periodStart, period);

  const [
    { data: currentOrders },
    { data: priorOrders },
    { data: orderItems },
    { data: products },
    { data: allPaidPhones },
  ] = await Promise.all([
    admin
      .from("orders")
      .select("*, coupons(code)")
      .eq("payment_status", "paid")
      .gte("created_at", periodStart.toISOString()),
    admin
      .from("orders")
      .select("id, total_inr, created_at")
      .eq("payment_status", "paid")
      .gte("created_at", priorStart.toISOString())
      .lt("created_at", periodStart.toISOString()),
    admin
      .from("order_items")
      .select("product_id, quantity, line_total_inr, orders!inner(payment_status, created_at)")
      .eq("orders.payment_status", "paid")
      .gte("orders.created_at", periodStart.toISOString()),
    admin.from("products").select("id, title, image_path"),
    admin
      .from("orders")
      .select("phone")
      .eq("payment_status", "paid")
      .lt("created_at", periodStart.toISOString()),
  ]);

  const orders = (currentOrders ?? []) as OrderRow[];
  const prior = priorOrders ?? [];

  const revenue = orders.reduce((s, o) => s + o.total_inr, 0);
  const priorRevenue = prior.reduce(
    (s, o) => s + (o.total_inr as number),
    0
  );
  const orderCount = orders.length;
  const priorOrderCount = prior.length;
  const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0;
  const priorAov =
    priorOrderCount > 0
      ? Math.round(priorRevenue / priorOrderCount)
      : 0;

  const phonesInPeriod = new Set(orders.map((o) => o.phone));
  const phonesBefore = new Set((allPaidPhones ?? []).map((o) => o.phone));
  let firstTime = 0;
  let repeat = 0;
  for (const phone of phonesInPeriod) {
    if (phonesBefore.has(phone)) repeat++;
    else firstTime++;
  }
  const repeatRate =
    phonesInPeriod.size > 0
      ? Math.round((repeat / phonesInPeriod.size) * 100)
      : 0;

  const avgDeliveryKm =
    orders.length > 0
      ? orders.reduce((s, o) => s + o.distance_km, 0) / orders.length
      : 0;

  const totalDiscount = orders.reduce((s, o) => s + o.discount_inr, 0);

  const cancelled = orders.filter((o) => o.status === "cancelled").length;
  const cancellationRate =
    orderCount > 0 ? Math.round((cancelled / orderCount) * 100) : 0;

  const days = eachDayOfInterval({ start: periodStart, end: now });
  const dailyTrend: DailyMetric[] = days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const dayOrders = orders.filter(
      (o) => format(parseISO(o.created_at), "yyyy-MM-dd") === key
    );
    return {
      date: key,
      label: format(day, "d MMM"),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.total_inr, 0),
    };
  });

  const productMap = new Map(
    (products ?? []).map((p) => [p.id, p])
  );
  const productAgg = new Map<string, { units: number; revenue: number }>();
  for (const item of orderItems ?? []) {
    const pid = item.product_id as string;
    const cur = productAgg.get(pid) ?? { units: 0, revenue: 0 };
    cur.units += item.quantity as number;
    cur.revenue += item.line_total_inr as number;
    productAgg.set(pid, cur);
  }

  const topProducts: ProductMetric[] = [...productAgg.entries()]
    .map(([productId, agg]) => {
      const p = productMap.get(productId);
      return {
        productId,
        title: p?.title ?? "Unknown",
        imagePath: p?.image_path ?? null,
        units: agg.units,
        revenue: agg.revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowCounts = Array(7).fill(0);
  for (const o of orders) {
    dowCounts[getDay(parseISO(o.created_at))]++;
  }
  const ordersByDayOfWeek = dayNames.map((day, i) => ({
    day,
    orders: dowCounts[i],
  }));

  const slotAgg = new Map<string, number>();
  for (const o of orders) {
    const w = `${o.delivery_window_start?.slice(0, 5) ?? "?"}`;
    slotAgg.set(w, (slotAgg.get(w) ?? 0) + 1);
  }
  const deliverySlots: SlotMetric[] = [...slotAgg.entries()]
    .map(([window, orders]) => ({ window, orders }))
    .sort((a, b) => a.window.localeCompare(b.window));

  const statusAgg = new Map<string, number>();
  for (const o of orders) {
    statusAgg.set(o.status, (statusAgg.get(o.status) ?? 0) + 1);
  }
  const orderStatus = [...statusAgg.entries()].map(([status, count]) => ({
    status,
    count,
  }));

  const couponAgg = new Map<string, { uses: number; discount: number }>();
  for (const o of orders) {
    if (!o.coupon_id || !o.coupons?.code) continue;
    const code = o.coupons.code;
    const cur = couponAgg.get(code) ?? { uses: 0, discount: 0 };
    cur.uses++;
    cur.discount += o.discount_inr;
    couponAgg.set(code, cur);
  }
  const coupons: CouponMetric[] = [...couponAgg.entries()]
    .map(([code, v]) => ({ code, uses: v.uses, discountGiven: v.discount }))
    .sort((a, b) => b.uses - a.uses);

  const insights: string[] = [];
  if (orderCount === 0) {
    insights.push(
      "No paid orders in this period yet. Promote FIRST59 for first-time customers."
    );
  } else {
    const bestDow = ordersByDayOfWeek.reduce((a, b) =>
      a.orders > b.orders ? a : b
    );
    if (bestDow.orders > 0) {
      insights.push(
        `${bestDow.day} is your busiest day with ${bestDow.orders} orders. Consider extra prep capacity.`
      );
    }
    if (repeatRate > 30) {
      insights.push(
        `${repeatRate}% of customers are returning — strong loyalty. A referral coupon could accelerate growth.`
      );
    } else if (firstTime > repeat) {
      insights.push(
        "Most customers are first-timers. Follow up with a thank-you note and FREEDEL on their next order above ₹1000."
      );
    }
    if (topProducts[0]) {
      insights.push(
        `${topProducts[0].title} drives ${topProducts[0].units} units (${formatCurrency(topProducts[0].revenue)} revenue) — feature it on the homepage hero.`
      );
    }
    if (avgDeliveryKm > 10) {
      insights.push(
        `Average delivery distance is ${avgDeliveryKm.toFixed(1)} km. Review fee slabs if margins feel tight on far orders.`
      );
    }
    const peakSlot = deliverySlots.reduce(
      (a, b) => (a.orders > b.orders ? a : b),
      { window: "", orders: 0 }
    );
    if (peakSlot.orders > 0) {
      insights.push(
        `Peak delivery window: ${peakSlot.window}. Ensure kitchen staffing matches slot demand.`
      );
    }
  }

  return {
    period,
    periodLabel:
      period === 7 ? "Last 7 days" : period === 30 ? "Last 30 days" : "Last 90 days",
    kpis: {
      revenue,
      revenueChange: pctChange(revenue, priorRevenue),
      orders: orderCount,
      ordersChange: pctChange(orderCount, priorOrderCount),
      aov,
      aovChange: pctChange(aov, priorAov),
      firstTimeCustomers: firstTime,
      repeatCustomers: repeat,
      repeatRate,
      avgDeliveryKm,
      totalDiscount,
      cancellationRate,
    },
    dailyTrend,
    topProducts,
    ordersByDayOfWeek,
    deliverySlots,
    orderStatus,
    coupons,
    insights,
  };
}
