"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getTodayDate } from "@/lib/inventory";
import { formatDeliveryWindow } from "@/lib/order-roster";
import type { RosterGroupMode } from "@/lib/order-roster";
import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, ClipboardList, Download, Loader2 } from "lucide-react";

type SlotSummary = {
  window: string;
  windowStart: string;
  windowEnd: string;
  count: number;
};

type DaySummary = {
  date: string;
  count: number;
};

type DownloadTarget =
  | { scope: "all" }
  | { scope: "slot"; windowStart: string; windowEnd: string }
  | { scope: "day"; day: string };

export default function OrderRosterPage() {
  const today = getTodayDate();
  const [mode, setMode] = useState<RosterGroupMode>("slot");
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState(
    format(addDays(new Date(), 6), "yyyy-MM-dd")
  );
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [slotSummaries, setSlotSummaries] = useState<SlotSummary[]>([]);
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const rangeStart = date;
  const rangeEnd = mode === "slot" ? date : endDate;

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = supabase
      .from("orders")
      .select("delivery_date, delivery_window_start, delivery_window_end")
      .eq("payment_status", "paid")
      .neq("status", "cancelled")
      .gte("delivery_date", rangeStart)
      .lte("delivery_date", rangeEnd)
      .order("delivery_date", { ascending: true })
      .order("delivery_window_start", { ascending: true });

    const { data, error: queryError } = await query;

    if (queryError) {
      setError("Could not load roster preview.");
      setOrderCount(null);
      setSlotSummaries([]);
      setDaySummaries([]);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    setOrderCount(rows.length);

    if (mode === "slot") {
      const slotMap = new Map<
        string,
        { windowStart: string; windowEnd: string; count: number }
      >();
      for (const row of rows) {
        const windowStart = row.delivery_window_start as string;
        const windowEnd = row.delivery_window_end as string;
        const key = `${windowStart}|${windowEnd}`;
        const current = slotMap.get(key) ?? {
          windowStart,
          windowEnd,
          count: 0,
        };
        current.count += 1;
        slotMap.set(key, current);
      }
      setSlotSummaries(
        [...slotMap.values()].map(({ windowStart, windowEnd, count }) => ({
          window: formatDeliveryWindow(windowStart, windowEnd),
          windowStart,
          windowEnd,
          count,
        }))
      );
      setDaySummaries([]);
    } else {
      const dayMap = new Map<string, number>();
      for (const row of rows) {
        const d = row.delivery_date as string;
        dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
      }
      setDaySummaries(
        [...dayMap.entries()].map(([date, count]) => ({ date, count }))
      );
      setSlotSummaries([]);
    }

    setLoading(false);
  }, [mode, rangeEnd, rangeStart, supabase]);

  useEffect(() => {
    if (mode === "day" && date > endDate) {
      setEndDate(date);
      return;
    }
    loadPreview();
  }, [date, endDate, loadPreview, mode]);

  const downloadKey = (target: DownloadTarget) => {
    if (target.scope === "all") return "all";
    if (target.scope === "slot") {
      return `slot:${target.windowStart}|${target.windowEnd}`;
    }
    return `day:${target.day}`;
  };

  const downloadRoster = async (target: DownloadTarget = { scope: "all" }) => {
    const key = downloadKey(target);
    setDownloading(key);
    setError(null);

    const params = new URLSearchParams({
      mode,
      date,
    });
    if (mode === "day") {
      params.set("endDate", endDate);
    }
    if (target.scope === "slot") {
      params.set("windowStart", target.windowStart);
      params.set("windowEnd", target.windowEnd);
    }
    if (target.scope === "day") {
      params.set("day", target.day);
    }

    try {
      const res = await fetch(`/api/admin/order-roster/export?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Download failed.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "order-roster.csv";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const isDownloadingAll = downloading === "all";

  return (
    <div>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20]"
      >
        <ArrowLeft size={14} /> Orders
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            Order Roster
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            Download paid delivery orders as CSV, grouped by time slot or day.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadRoster()}
          disabled={Boolean(downloading) || loading}
          className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[#4B2C20] px-4 text-sm font-medium text-white transition hover:bg-[#3d2319] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDownloadingAll ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Download CSV
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("slot")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              mode === "slot"
                ? "bg-[#4B2C20] text-white"
                : "bg-[#F5E6D3]/50 text-[#4B2C20]/70 hover:bg-[#F5E6D3]"
            }`}
          >
            Time slot wise
          </button>
          <button
            type="button"
            onClick={() => setMode("day")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              mode === "day"
                ? "bg-[#4B2C20] text-white"
                : "bg-[#F5E6D3]/50 text-[#4B2C20]/70 hover:bg-[#F5E6D3]"
            }`}
          >
            Day wise
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <label className="block text-sm">
            <span className="font-medium text-[#4B2C20]">
              {mode === "slot" ? "Delivery date" : "From"}
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 block h-[42px] rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20]"
            />
          </label>

          {mode === "day" && (
            <label className="block text-sm">
              <span className="font-medium text-[#4B2C20]">To</span>
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5 block h-[42px] rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20]"
              />
            </label>
          )}
        </div>

        <p className="mt-4 text-xs text-[#4B2C20]/50">
          {mode === "slot"
            ? "Downloads one CSV per time slot (ZIP if multiple slots). Use the preview to download a single slot."
            : "Downloads one CSV per day (ZIP if multiple days). Use the preview to download a single day."}
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#4B2C20]">
          <ClipboardList size={16} />
          Preview
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-[#4B2C20]/50">Loading preview…</p>
        ) : orderCount === 0 ? (
          <p className="mt-4 text-sm text-[#4B2C20]/50">
            No paid orders scheduled for this{" "}
            {mode === "slot" ? "date" : "range"}.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-[#4B2C20]/70">
              {orderCount} order{orderCount === 1 ? "" : "s"} ready to export
            </p>

            {mode === "slot" && slotSummaries.length > 0 && (
              <ul className="mt-4 space-y-2">
                {slotSummaries.map(
                  ({ window, windowStart, windowEnd, count }) => {
                    const key = downloadKey({
                      scope: "slot",
                      windowStart,
                      windowEnd,
                    });
                    const isDownloading = downloading === key;

                    return (
                      <li
                        key={window}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[#F5E6D3]/30 px-4 py-3 text-sm"
                      >
                        <div>
                          <span className="font-medium text-[#4B2C20]">
                            {window}
                          </span>
                          <span className="ml-2 text-[#4B2C20]/60">
                            {count} order{count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={Boolean(downloading)}
                          onClick={() =>
                            downloadRoster({
                              scope: "slot",
                              windowStart,
                              windowEnd,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#4B2C20]/70 hover:bg-white hover:text-[#4B2C20] disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          CSV
                        </button>
                      </li>
                    );
                  }
                )}
              </ul>
            )}

            {mode === "day" && daySummaries.length > 0 && (
              <ul className="mt-4 space-y-2">
                {daySummaries.map(({ date: day, count }) => {
                  const key = downloadKey({ scope: "day", day });
                  const isDownloading = downloading === key;

                  return (
                    <li
                      key={day}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#F5E6D3]/30 px-4 py-3 text-sm"
                    >
                      <div>
                        <span className="font-medium text-[#4B2C20]">
                          {format(parseISO(day), "EEE, d MMM yyyy")}
                        </span>
                        <span className="ml-2 text-[#4B2C20]/60">
                          {count} order{count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(downloading)}
                        onClick={() => downloadRoster({ scope: "day", day })}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#4B2C20]/70 hover:bg-white hover:text-[#4B2C20] disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        CSV
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
