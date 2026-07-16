"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Bell,
  BellOff,
  ChefHat,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { useAdminNotifications } from "@/components/admin/AdminNotificationProvider";
import { OrderStatusBadge } from "@/components/admin/orders/OrderBadges";
import { OrderStatusChangeModal } from "@/components/admin/orders/OrderStatusChangeModal";
import { ListSkeleton } from "@/components/admin/ui/AdminPageSkeleton";
import { mergeAdminOrderUpdate } from "@/lib/admin-orders-query";
import {
  ADMIN_ORDERS_CHANGED_EVENT,
} from "@/lib/admin-notifications";
import { orderShortId } from "@/lib/order-badges";
import {
  buildKitchenBoard,
  formatKitchenOrderItems,
  kitchenBakeUnits,
  kitchenProgressLabel,
  kitchenSummaryChips,
  type KitchenBoard,
  type KitchenOrder,
  type KitchenSlotBoard,
} from "@/lib/kitchen";
import type { OrderStatusUpdatePayload } from "@/lib/order-status-update";
import { shopDateKey, shopDatePlusDays, shopWallClockToDate } from "@/lib/shop-timezone";
import type { Order, OrderStatus } from "@/lib/types";

const KITCHEN_POLL_MS = 30_000;

type KitchenView = "bake" | "pack";

function resolveFocusSlotKey(
  date: string,
  slots: KitchenSlotBoard[],
  now = new Date()
): string | null {
  if (date !== shopDateKey(now) || slots.length === 0) return null;
  for (const slot of slots) {
    const end = shopWallClockToDate(date, slot.windowEnd.slice(0, 5));
    if (now.getTime() <= end.getTime()) return slot.key;
  }
  return slots[slots.length - 1]?.key ?? null;
}

function quickFilterClass(active: boolean) {
  return `h-[42px] rounded-xl px-4 text-sm font-medium transition ${
    active
      ? "bg-[#4B2C20] text-white"
      : "bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10 hover:ring-[#4B2C20]/20"
  }`;
}

function viewTabClass(active: boolean) {
  return `rounded-full px-4 py-2 text-sm font-medium transition ${
    active
      ? "bg-[#4B2C20] text-white"
      : "text-[#4B2C20]/70 hover:text-[#4B2C20]"
  }`;
}

function SlotProgressBar({ slot }: { slot: KitchenSlotBoard }) {
  const { counts } = slot;
  if (counts.total === 0) return null;

  const out = counts.dispatched + counts.done;
  const pct = Math.round((out / counts.total) * 100);
  const showBar = out > 0;

  return (
    <div className="mt-2">
      <p className="text-xs text-[#4B2C20]/60">{kitchenProgressLabel(counts)}</p>
      {showBar ? (
        <>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[#4B2C20]/45">
            <span>
              {out} of {counts.total} out
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#4B2C20]/10">
            <div
              className="h-full rounded-full bg-[#4B2C20] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function BakeTable({
  lines,
  emptyLabel,
}: {
  lines: KitchenBoard["bakeLines"];
  emptyLabel: string;
}) {
  if (lines.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[#4B2C20]/50">{emptyLabel}</p>
    );
  }

  const hasReady = lines.some((line) => line.readyQty > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#4B2C20]/10 text-xs uppercase tracking-wide text-[#4B2C20]/50">
            <th className="pb-2 font-medium">Product</th>
            <th className="pb-2 text-right font-medium">To bake</th>
            {hasReady && (
              <th className="pb-2 text-right font-medium">From fridge</th>
            )}
            {hasReady && (
              <th className="pb-2 text-right font-medium">Total</th>
            )}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr
              key={line.productId}
              className="border-b border-[#4B2C20]/5 last:border-0"
            >
              <td className="py-3 pr-3 font-medium text-[#4B2C20]">
                {line.title}
              </td>
              <td className="py-3 text-right tabular-nums">
                <span
                  className={
                    line.prepQty > 0
                      ? "text-lg font-semibold text-[#4B2C20]"
                      : "text-[#4B2C20]/35"
                  }
                >
                  {line.prepQty}
                </span>
              </td>
              {hasReady && (
                <td className="py-3 text-right tabular-nums text-[#4B2C20]/55">
                  {line.readyQty}
                </td>
              )}
              {hasReady && (
                <td className="py-3 text-right tabular-nums font-medium text-[#4B2C20]">
                  {line.totalQty}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PackOrderCard({
  order,
  busy,
  onAdvance,
}: {
  order: KitchenOrder;
  busy: boolean;
  onAdvance: (order: KitchenOrder, status: OrderStatus) => void;
}) {
  const nextAction =
    order.status === "pending"
      ? ({ status: "confirmed" as const, label: "Confirm" })
      : order.status === "confirmed"
        ? ({ status: "preparing" as const, label: "Start prep" })
        : null;

  return (
    <div className="rounded-xl bg-[#F5E6D3]/40 p-4 ring-1 ring-[#4B2C20]/8">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/orders/${order.id}`}
              className="font-semibold text-[#4B2C20] hover:underline"
            >
              #{orderShortId(order.order_number)}
            </Link>
            <OrderStatusBadge status={order.status} />
            {order.uses_ready_stock ? (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-800">
                From fridge
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                Bake fresh
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#4B2C20]/80">{order.customer_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextAction && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdvance(order, nextAction.status)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#4B2C20] px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {nextAction.label}
            </button>
          )}
          {order.status === "preparing" && (
            <Link
              href={`/admin/orders/${order.id}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium text-[#4B2C20] ring-1 ring-[#4B2C20]/15"
            >
              Dispatch
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#4B2C20]">
        {formatKitchenOrderItems(order)}
      </p>
    </div>
  );
}

export function KitchenPageClient() {
  const today = shopDateKey();
  const tomorrow = shopDatePlusDays(1);
  const {
    soundEnabled,
    setSoundEnabled,
    enableAlerts,
    notify,
    notificationPermission,
    notificationsSupported,
  } = useAdminNotifications();
  const [date, setDate] = useState(today);
  const [view, setView] = useState<KitchenView>("bake");
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkBusyKey, setBulkBusyKey] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<KitchenOrder | null>(
    null
  );
  const [statusModalTarget, setStatusModalTarget] =
    useState<OrderStatus | null>(null);
  const [liveFlash, setLiveFlash] = useState(false);
  const orderIdsRef = useRef<Set<string>>(new Set());
  const boardReadyRef = useRef(false);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/kitchen?date=${encodeURIComponent(date)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load kitchen board");
        setOrders([]);
      } else {
        const nextOrders = (data.orders ?? []) as KitchenOrder[];
        const nextIds = new Set(nextOrders.map((o) => o.id));

        if (boardReadyRef.current && opts?.soft) {
          const added = nextOrders.some((o) => !orderIdsRef.current.has(o.id));
          if (added) {
            setLiveFlash(true);
            window.setTimeout(() => setLiveFlash(false), 2500);
          }
        }

        orderIdsRef.current = nextIds;
        boardReadyRef.current = true;
        setOrders(nextOrders);
      }
    } catch {
      setError("Failed to load kitchen board");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => {
    boardReadyRef.current = false;
    orderIdsRef.current = new Set();
    load();
  }, [load]);

  useEffect(() => {
    const onOrdersChanged = () => {
      void load({ soft: true });
    };
    window.addEventListener(ADMIN_ORDERS_CHANGED_EVENT, onOrdersChanged);
    const poll = window.setInterval(() => {
      void load({ soft: true });
    }, KITCHEN_POLL_MS);
    return () => {
      window.removeEventListener(ADMIN_ORDERS_CHANGED_EVENT, onOrdersChanged);
      window.clearInterval(poll);
    };
  }, [load]);

  const alertsNeedSetup =
    !soundEnabled ||
    (notificationsSupported && notificationPermission !== "granted");

  const testAlert = () => {
    notify({
      title: "Kitchen alert test",
      body: "Sound and notifications are working for this device.",
      tag: "kitchen-alert-test",
      url: "/admin/kitchen",
      playSound: true,
    });
  };

  const board = useMemo(
    () => buildKitchenBoard(date, orders),
    [date, orders]
  );

  const focusSlotKey = useMemo(
    () => resolveFocusSlotKey(date, board.slots),
    [date, board.slots]
  );

  const dateLabel = useMemo(() => {
    try {
      return format(parseISO(date), "EEE d MMM");
    } catch {
      return date;
    }
  }, [date]);

  const requestStatusChange = (order: KitchenOrder, status: OrderStatus) => {
    if (updatingId) return;
    setStatusError(null);
    setStatusModalOrder(order);
    setStatusModalTarget(status);
  };

  const closeStatusModal = () => {
    if (updatingId) return;
    setStatusModalOrder(null);
    setStatusModalTarget(null);
    setStatusError(null);
  };

  const confirmStatusChange = async (payload: OrderStatusUpdatePayload) => {
    if (!statusModalOrder) return;
    const orderId = statusModalOrder.id;
    setUpdatingId(orderId);
    setStatusError(null);

    const body: Record<string, string> = { status: payload.status };
    if (payload.dispatchMode) body.dispatch_mode = payload.dispatchMode;
    if (payload.delivery) Object.assign(body, payload.delivery);
    if (payload.deliveryEta) {
      body.delivery_eta_date = payload.deliveryEta.date;
      body.delivery_eta_window_start = payload.deliveryEta.window_start;
      body.delivery_eta_window_end = payload.deliveryEta.window_end;
    }

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatusError(data.error ?? "Failed to update status");
    } else {
      const updated = data as Order;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? (mergeAdminOrderUpdate(o, updated) as KitchenOrder)
            : o
        )
      );
      closeStatusModal();
    }
    setUpdatingId(null);
  };

  const bulkAdvance = async (
    slot: KitchenSlotBoard,
    status: "confirmed" | "preparing"
  ) => {
    const key = `${slot.key}:${status}`;
    setBulkBusyKey(key);
    setStatusError(null);

    try {
      const res = await fetch("/api/admin/kitchen/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          window_start: slot.windowStart,
          window_end: slot.windowEnd,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error ?? "Bulk update failed");
      } else {
        const updated = (data.orders ?? []) as KitchenOrder[];
        if (updated.length > 0) {
          const byId = new Map(updated.map((o) => [o.id, o]));
          setOrders((prev) =>
            prev.map((o) => {
              const next = byId.get(o.id);
              return next ? (mergeAdminOrderUpdate(o, next) as KitchenOrder) : o;
            })
          );
        }
      }
    } catch {
      setStatusError("Bulk update failed");
    } finally {
      setBulkBusyKey(null);
    }
  };

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            Kitchen
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            What to prep and pack for each delivery slot
            <span className="ml-2 inline-flex items-center gap-1.5 text-[#4B2C20]/45">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  liveFlash ? "bg-emerald-500" : "bg-emerald-400/70"
                }`}
              />
              {liveFlash ? "Updated" : "Live"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={testAlert}
            className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
          >
            <Volume2 className="h-4 w-4" />
            Test alert
          </button>
          <button
            type="button"
            onClick={() => load({ soft: true })}
            disabled={loading || refreshing}
            className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <Link
            href="/admin/orders/roster"
            className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
          >
            <ClipboardList className="h-4 w-4" />
            Roster
          </Link>
        </div>
      </div>

      {alertsNeedSetup && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#4B2C20] px-4 py-3 text-white print:hidden">
          <div className="flex items-start gap-3">
            {soundEnabled ? (
              <Bell className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <BellOff className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">Turn on kitchen alerts</p>
              <p className="mt-0.5 text-xs text-white/75">
                {!soundEnabled
                  ? "Sound is off — you will not hear new order alerts."
                  : "Allow browser notifications so alerts work when this tab is in the background."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!soundEnabled && (
              <button
                type="button"
                onClick={() => setSoundEnabled(true)}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#4B2C20]"
              >
                Enable sound
              </button>
            )}
            <button
              type="button"
              onClick={() => void enableAlerts()}
              className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/25"
            >
              Enable alerts
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          className={quickFilterClass(date === today)}
          onClick={() => setDate(today)}
        >
          Today
        </button>
        <button
          type="button"
          className={quickFilterClass(date === tomorrow)}
          onClick={() => setDate(tomorrow)}
        >
          Tomorrow
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-[42px] rounded-xl bg-white px-3 text-sm text-[#4B2C20] ring-1 ring-[#4B2C20]/10 outline-none focus:ring-[#4B2C20]/30"
        />
        <div className="ml-auto flex rounded-full bg-white p-1 ring-1 ring-[#4B2C20]/10">
          <button
            type="button"
            className={viewTabClass(view === "bake")}
            onClick={() => setView("bake")}
          >
            <span className="inline-flex items-center gap-1.5">
              <ChefHat className="h-4 w-4" />
              Bake
            </span>
          </button>
          <button
            type="button"
            className={viewTabClass(view === "pack")}
            onClick={() => setView("pack")}
          >
            <span className="inline-flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              Pack
            </span>
          </button>
        </div>
      </div>

      {(error || statusError) && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200 print:hidden">
          {error ?? statusError}
        </div>
      )}

      {loading ? (
        <ListSkeleton count={4} />
      ) : (
        <>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10 print:ring-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#4B2C20]/45">
                  Delivery day
                </p>
                <h2 className="font-serif text-xl font-semibold text-[#4B2C20]">
                  {dateLabel}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-[#4B2C20]/70">
                {kitchenSummaryChips(board.totals).map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-[#F5E6D3]/70 px-2.5 py-1 text-xs font-medium text-[#4B2C20]"
                  >
                    {chip}
                  </span>
                ))}
                {(() => {
                  const units = kitchenBakeUnits(board.bakeLines);
                  if (units.toBake <= 0 && units.fromFridge <= 0) return null;
                  const parts: string[] = [];
                  if (units.toBake > 0) {
                    parts.push(
                      `${units.toBake} item${units.toBake === 1 ? "" : "s"} to bake`
                    );
                  }
                  if (units.fromFridge > 0) {
                    parts.push(`${units.fromFridge} from fridge`);
                  }
                  return (
                    <span className="rounded-full bg-[#4B2C20]/8 px-2.5 py-1 text-xs font-medium text-[#4B2C20]">
                      {parts.join(" · ")}
                    </span>
                  );
                })()}
              </div>
            </div>

            {view === "bake" && board.slots.length > 0 && (
              <div className="mt-5 border-t border-[#4B2C20]/8 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-[#4B2C20]">
                  Day bake list
                </h3>
                <BakeTable
                  lines={board.bakeLines}
                  emptyLabel="Nothing left to bake for this day"
                />
              </div>
            )}
          </div>

          {board.slots.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-[#4B2C20]/10">
              <ChefHat className="mx-auto h-10 w-10 text-[#4B2C20]/25" />
              <p className="mt-3 font-medium text-[#4B2C20]">
                No paid orders for this day
              </p>
              <p className="mt-1 text-sm text-[#4B2C20]/50">
                Pick another date or wait for new orders to come in.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {board.slots.map((slot) => {
                const focused = slot.key === focusSlotKey;
                return (
                <section
                  key={slot.key}
                  id={`kitchen-slot-${slot.key}`}
                  className={`rounded-2xl bg-white p-5 ring-1 print:break-inside-avoid ${
                    focused
                      ? "ring-2 ring-[#4B2C20]"
                      : "ring-[#4B2C20]/10"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg font-semibold text-[#4B2C20]">
                          {slot.windowLabel}
                        </h3>
                        {focused && (
                          <span className="rounded-full bg-[#4B2C20] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white print:hidden">
                            Next up
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-[#4B2C20]/55">
                        {slot.counts.total} order
                        {slot.counts.total === 1 ? "" : "s"}
                        {(() => {
                          const units = kitchenBakeUnits(slot.bakeLines);
                          if (units.toBake <= 0) return null;
                          return ` · ${units.toBake} to bake`;
                        })()}
                        {slot.counts.readyStockOrders > 0
                          ? ` · ${slot.counts.readyStockOrders} from fridge`
                          : ""}
                      </p>
                      <SlotProgressBar slot={slot} />
                    </div>

                    <div className="flex flex-wrap gap-2 print:hidden">
                      {slot.counts.pending > 0 && (
                        <button
                          type="button"
                          disabled={bulkBusyKey === `${slot.key}:confirmed`}
                          onClick={() => bulkAdvance(slot, "confirmed")}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium text-[#4B2C20] ring-1 ring-[#4B2C20]/15 disabled:opacity-50"
                        >
                          {bulkBusyKey === `${slot.key}:confirmed` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          Confirm{" "}
                          {slot.counts.pending === 1
                            ? "order"
                            : `${slot.counts.pending} orders`}
                        </button>
                      )}
                      {slot.counts.confirmed > 0 && (
                        <button
                          type="button"
                          disabled={bulkBusyKey === `${slot.key}:preparing`}
                          onClick={() => bulkAdvance(slot, "preparing")}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#4B2C20] px-3 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {bulkBusyKey === `${slot.key}:preparing` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ChefHat className="h-4 w-4" />
                          )}
                          Start prep
                          {slot.counts.confirmed > 1
                            ? ` (${slot.counts.confirmed})`
                            : ""}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    {view === "bake" ? (
                      <BakeTable
                        lines={slot.bakeLines}
                        emptyLabel="No active bake items for this slot"
                      />
                    ) : (
                      <div className="space-y-3">
                        {slot.orders.map((order) => (
                          <PackOrderCard
                            key={order.id}
                            order={order}
                            busy={updatingId === order.id}
                            onAdvance={requestStatusChange}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <OrderStatusChangeModal
        order={statusModalOrder}
        targetStatus={statusModalTarget}
        saving={updatingId === statusModalOrder?.id}
        error={statusError}
        onClose={closeStatusModal}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}
