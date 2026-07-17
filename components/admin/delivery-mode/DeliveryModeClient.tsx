"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Loader2, LogOut, RefreshCw, Truck } from "lucide-react";
import { DeliveryStopCard } from "@/components/admin/delivery-mode/DeliveryStopCard";
import {
  DELIVERY_MODE_POLL_MS,
  setDeliveryModeEnabled,
} from "@/lib/delivery-mode";
import { shopDateKey } from "@/lib/shop-timezone";
import type { Order } from "@/lib/types";

export function DeliveryModeClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const today = shopDateKey();

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/delivery-mode");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load stops");
        setOrders([]);
      } else {
        setOrders((data.orders ?? []) as Order[]);
      }
    } catch {
      setError("Failed to load stops");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setDeliveryModeEnabled(true);
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load({ soft: true });
    }, DELIVERY_MODE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      const key = order.delivery_date;
      const list = map.get(key) ?? [];
      list.push(order);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [orders]);

  const exit = () => {
    setDeliveryModeEnabled(false);
    router.push("/admin");
  };

  const markDelivered = async (order: Order) => {
    setBusyId(order.id);
    setError(null);
    const previous = orders;
    setOrders((prev) => prev.filter((o) => o.id !== order.id));

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrders(previous);
        setError(data.error ?? "Could not mark delivered");
      }
    } catch {
      setOrders(previous);
      setError("Could not mark delivered");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-[#F5E6D3]">
      <header className="sticky top-0 z-20 border-b border-[#4B2C20]/10 bg-[#F5E6D3]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#4B2C20]" />
              <h1 className="font-serif text-xl font-semibold text-[#4B2C20]">
                Delivery Mode
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#4B2C20]/60">
              {orders.length} stop{orders.length === 1 ? "" : "s"} left ·{" "}
              {format(parseISO(today), "EEE, d MMM")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void load({ soft: true })}
              disabled={loading || refreshing}
              aria-label="Refresh"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={exit}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#4B2C20] px-3 text-sm font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              Exit
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-4 sm:px-4">
        {error ? (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#4B2C20]/40" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-[#4B2C20]/10">
            <Truck className="mx-auto h-10 w-10 text-[#4B2C20]/30" />
            <p className="mt-3 font-medium text-[#4B2C20]">
              No self deliveries out right now
            </p>
            <p className="mt-1 text-sm text-[#4B2C20]/55">
              Dispatch as Self delivery from Kitchen when you leave.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void load({ soft: true })}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#4B2C20] text-sm font-semibold text-white"
              >
                Refresh
              </button>
              <Link
                href="/admin/kitchen"
                onClick={() => setDeliveryModeEnabled(false)}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#4B2C20] ring-1 ring-[#4B2C20]/15"
              >
                Open Kitchen
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, dayOrders]) => (
              <section key={date}>
                {grouped.length > 1 ? (
                  <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#4B2C20]/45">
                    {date === today
                      ? "Today"
                      : format(parseISO(date), "EEEE, d MMM")}
                  </h2>
                ) : null}
                <ul className="space-y-3">
                  {dayOrders.map((order) => (
                    <li key={order.id}>
                      <DeliveryStopCard
                        order={order}
                        busy={busyId === order.id}
                        onMarkDelivered={markDelivered}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
