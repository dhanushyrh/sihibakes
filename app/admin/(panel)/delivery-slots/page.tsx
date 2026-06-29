"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DeliverySlot, Product, ShopSettings } from "@/lib/types";
import { DEFAULT_DAILY_QUANTITY } from "@/lib/inventory";
import { normalizeClosedDates } from "@/lib/shop-closed-days";
import {
  DEFAULT_DELIVERY_WINDOWS,
  GENERATE_WEEKS_AHEAD,
  getDatesFromToday,
  getWeekDates,
  MAX_WEEK_OFFSET,
} from "@/lib/calendar-week";
import { StockCalendar } from "@/components/admin/calendar/StockCalendar";
import { DayViewDrawer } from "@/components/admin/calendar/DayViewDrawer";
import { Skeleton } from "@/components/admin/ui/Skeleton";
import { Calendar, CalendarPlus } from "lucide-react";

export default function AdminDeliverySlotsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingSlotId, setTogglingSlotId] = useState<string | null>(null);
  const [closingDay, setClosingDay] = useState(false);
  const supabase = createClient();

  const weekDates = getWeekDates(weekOffset);
  const rangeStart = weekDates[0];
  const rangeEnd = weekDates[weekDates.length - 1];

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: slotData }, { data: productData }, { data: availData }, { data: countData }, { data: settingsData }] =
      await Promise.all([
        supabase
          .from("delivery_slots")
          .select("*")
          .gte("slot_date", rangeStart)
          .lte("slot_date", rangeEnd)
          .order("slot_date")
          .order("window_start"),
        supabase.from("products").select("*").order("title"),
        supabase
          .from("product_daily_availability")
          .select("*")
          .gte("avail_date", rangeStart)
          .lte("avail_date", rangeEnd),
        supabase
          .from("product_daily_counts")
          .select("product_id, count_date, order_count")
          .gte("count_date", rangeStart)
          .lte("count_date", rangeEnd),
        supabase.from("shop_settings").select("*").limit(1).single(),
      ]);

    setSettings(
      settingsData
        ? {
            ...(settingsData as ShopSettings),
            closed_dates: normalizeClosedDates(settingsData.closed_dates),
          }
        : null
    );

    setSlots((slotData ?? []) as DeliverySlot[]);
    setProducts((productData ?? []) as Product[]);

    const countMap: Record<string, number> = {};
    for (const row of countData ?? []) {
      countMap[`${row.product_id}:${row.count_date}`] = row.order_count as number;
    }
    setOrderCounts((prev) => ({ ...prev, ...countMap }));

    setQuantities((prev) => {
      const next = { ...prev };
      for (const row of availData ?? []) {
        next[`${row.product_id}:${row.avail_date}`] = row.quantity_limit as number;
      }
      for (const p of productData ?? []) {
        for (const d of weekDates) {
          const key = `${p.id}:${d}`;
          if (!(key in next)) next[key] = DEFAULT_DAILY_QUANTITY;
        }
      }
      return next;
    });
    setLoading(false);
  }, [rangeStart, rangeEnd, supabase, weekDates]);

  useEffect(() => {
    load();
  }, [load]);

  const goToThisWeek = () => {
    setWeekOffset(0);
    setSelectedDate(null);
  };

  const slotKey = (slotDate: string, start: string, end: string) =>
    `${slotDate}|${start.slice(0, 5)}|${end.slice(0, 5)}`;

  const generateFourWeeks = async () => {
    if (
      !confirm(
        `Generate delivery windows for the next ${GENERATE_WEEKS_AHEAD} weeks (from today)? Existing slots are kept.`
      )
    ) {
      return;
    }
    setGenerating(true);

    const dates = getDatesFromToday(GENERATE_WEEKS_AHEAD * 7);
    const rangeStart = dates[0];
    const rangeEnd = dates[dates.length - 1];

    const { data: existing, error: fetchError } = await supabase
      .from("delivery_slots")
      .select("slot_date, window_start, window_end")
      .gte("slot_date", rangeStart)
      .lte("slot_date", rangeEnd);

    if (fetchError) {
      alert(`Could not load existing slots: ${fetchError.message}`);
      setGenerating(false);
      return;
    }

    const existingKeys = new Set(
      (existing ?? []).map((row) =>
        slotKey(
          row.slot_date as string,
          row.window_start as string,
          row.window_end as string
        )
      )
    );

    const inserts: {
      slot_date: string;
      window_start: string;
      window_end: string;
      is_active: boolean;
    }[] = [];

    for (const date of dates) {
      for (const w of DEFAULT_DELIVERY_WINDOWS) {
        const key = slotKey(date, w.start, w.end);
        if (!existingKeys.has(key)) {
          inserts.push({
            slot_date: date,
            window_start: w.start,
            window_end: w.end,
            is_active: true,
          });
        }
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from("delivery_slots")
        .insert(inserts);

      if (insertError) {
        alert(`Could not generate slots: ${insertError.message}`);
        setGenerating(false);
        return;
      }
    }

    setGenerating(false);
    await load();
  };

  const wouldCloseDay = (slotDate: string, slotId: string, turningOff: boolean) => {
    if (!turningOff) return false;
    const daySlots = slots.filter((s) => s.slot_date === slotDate);
    const otherActive = daySlots.filter(
      (s) => s.id !== slotId && s.is_active
    ).length;
    return daySlots.length > 0 && otherActive === 0;
  };

  const checkCanCloseDay = async (date: string): Promise<string | null> => {
    const res = await fetch(
      `/api/admin/delivery/can-close?date=${encodeURIComponent(date)}`
    );
    const data = await res.json();
    if (!res.ok) {
      return data.error ?? "Could not verify orders for this day";
    }
    return data.canClose ? null : (data.error as string);
  };

  const toggleSlot = async (slot: DeliverySlot, is_active: boolean) => {
    if (wouldCloseDay(slot.slot_date, slot.id, !is_active)) {
      const error = await checkCanCloseDay(slot.slot_date);
      if (error) {
        alert(error);
        return;
      }
    }

    setTogglingSlotId(slot.id);
    await supabase.from("delivery_slots").update({ is_active }).eq("id", slot.id);
    const updatedSlots = slots.map((s) =>
      s.id === slot.id ? { ...s, is_active } : s
    );
    setSlots(updatedSlots);

    if (settings) {
      const daySlots = updatedSlots.filter((s) => s.slot_date === slot.slot_date);
      const allOff =
        daySlots.length > 0 && daySlots.every((s) => !s.is_active);
      const closedDates = new Set(settings.closed_dates);

      if (allOff) {
        closedDates.add(slot.slot_date);
      } else if (is_active) {
        closedDates.delete(slot.slot_date);
      }

      const nextClosed = [...closedDates].sort();
      if (nextClosed.join() !== settings.closed_dates.join()) {
        await supabase
          .from("shop_settings")
          .update({
            closed_dates: nextClosed,
            updated_at: new Date().toISOString(),
          })
          .eq("id", settings.id);
        setSettings({ ...settings, closed_dates: nextClosed });
      }
    }

    setTogglingSlotId(null);
  };

  const closeDay = async (date: string): Promise<string | null> => {
    if (
      !confirm(
        `Close the store for ${date}? All delivery windows will be turned off.`
      )
    ) {
      return null;
    }

    setClosingDay(true);

    try {
      const res = await fetch("/api/admin/delivery/close-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();

      if (!res.ok) {
        return data.error ?? "Could not close this day";
      }

      await load();
      return null;
    } catch {
      return "Could not close this day";
    } finally {
      setClosingDay(false);
    }
  };

  const openDay = async (date: string) => {
    setClosingDay(true);
    try {
      const res = await fetch("/api/admin/delivery/open-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Could not open this day");
        return;
      }
      await load();
    } finally {
      setClosingDay(false);
    }
  };

  const setQty = (productId: string, date: string, value: number) => {
    const ordered = orderCounts[`${productId}:${date}`] ?? 0;
    const minAvail = Math.max(1, ordered);
    setQuantities((prev) => ({
      ...prev,
      [`${productId}:${date}`]: Math.max(minAvail, value),
    }));
  };

  const applyDefaultForDay = (date: string) => {
    setQuantities((prev) => {
      const next = { ...prev };
      for (const p of products) {
        const ordered = orderCounts[`${p.id}:${date}`] ?? 0;
        next[`${p.id}:${date}`] = Math.max(DEFAULT_DAILY_QUANTITY, ordered);
      }
      return next;
    });
  };

  const saveDay = async (
    date: string,
    dayLimits?: Record<string, number>
  ) => {
    setSaving(true);
    const rows = products.map((p) => ({
      product_id: p.id,
      avail_date: date,
      quantity_limit:
        dayLimits?.[p.id] ??
        quantities[`${p.id}:${date}`] ??
        DEFAULT_DAILY_QUANTITY,
    }));
    const { error } = await supabase.from("product_daily_availability").upsert(rows, {
      onConflict: "product_id,avail_date",
    });
    setSaving(false);
    if (error) {
      alert(`Could not save availability: ${error.message}`);
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#4B2C20]">
            Delivery &amp; Stock
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            Calendar view — plan windows and quantities for upcoming weeks
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToThisWeek}
            className="flex items-center gap-1.5 rounded-full border border-[#4B2C20]/20 px-4 py-2 text-sm text-[#4B2C20]"
          >
            <Calendar size={16} />
            This week
          </button>
          <button
            type="button"
            disabled={generating}
            onClick={generateFourWeeks}
            className="flex items-center gap-1.5 rounded-full bg-[#4B2C20] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            <CalendarPlus size={16} />
            {generating ? "Generating..." : "Generate 4 weeks"}
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      ) : (
        <StockCalendar
          weekOffset={weekOffset}
          maxWeekOffset={MAX_WEEK_OFFSET}
          onWeekChange={setWeekOffset}
          slots={slots}
          products={products}
          quantities={quantities}
          orderCounts={orderCounts}
          closedDates={settings?.closed_dates ?? []}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      <DayViewDrawer
        date={selectedDate}
        products={products}
        slots={slots}
        quantities={quantities}
        orderCounts={orderCounts}
        closedDates={settings?.closed_dates ?? []}
        onClose={() => setSelectedDate(null)}
        onQtyChange={setQty}
        onSlotToggle={toggleSlot}
        onSaveDay={saveDay}
        onApplyDefault={applyDefaultForDay}
        onCloseDay={closeDay}
        onOpenDay={openDay}
        saving={saving}
        togglingSlotId={togglingSlotId}
        closingDay={closingDay}
      />
    </div>
  );
}
