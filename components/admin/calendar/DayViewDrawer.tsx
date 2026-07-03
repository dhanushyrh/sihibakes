"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { DeliverySlot, Product } from "@/lib/types";
import { DEFAULT_DAILY_QUANTITY } from "@/lib/inventory";
import { getRemaining, minAvailableStock } from "@/lib/inventory";
import { getReadyAvailable } from "@/lib/customer-delivery-slots";
import { isDayClosed } from "@/lib/delivery-day";
import { ConfirmSwitch } from "@/components/admin/ConfirmSwitch";
import { formatDayFull } from "@/lib/calendar-week";
import { X, Save, Pencil, Eye, Store, LockOpen } from "lucide-react";

interface DayViewDrawerProps {
  date: string | null;
  products: Product[];
  slots: DeliverySlot[];
  quantities: Record<string, number>;
  readyQuantities: Record<string, number>;
  readyCounts: Record<string, { reserved: number; fulfilled: number }>;
  orderCounts: Record<string, number>;
  closedDates: string[];
  onClose: () => void;
  onQtyChange: (productId: string, date: string, qty: number) => void;
  onReadyChange: (productId: string, date: string, qty: number) => void;
  onSlotToggle: (slot: DeliverySlot, active: boolean) => void;
  onSaveDay: (
    date: string,
    dayLimits?: Record<string, number>,
    dayReadyLimits?: Record<string, number>
  ) => void | Promise<void>;
  onApplyDefault: (date: string) => void;
  onCloseDay: (date: string) => Promise<string | null>;
  onOpenDay: (date: string) => void;
  saving: boolean;
  togglingSlotId: string | null;
  closingDay: boolean;
}

export function DayViewDrawer({
  date,
  products,
  slots,
  quantities,
  readyQuantities,
  readyCounts,
  orderCounts,
  closedDates,
  onClose,
  onQtyChange,
  onReadyChange,
  onSlotToggle,
  onSaveDay,
  onApplyDefault,
  onCloseDay,
  onOpenDay,
  saving,
  togglingSlotId,
  closingDay,
}: DayViewDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [readyDraft, setReadyDraft] = useState<Record<string, string>>({});
  const [closeError, setCloseError] = useState<string | null>(null);

  useEffect(() => {
    setIsEditing(false);
    setQtyDraft({});
    setReadyDraft({});
    setCloseError(null);
  }, [date]);

  const parseQty = (raw: string, minAvail: number, fallback: number) => {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.max(minAvail, parsed);
  };

  const startEditing = () => {
    if (!date) return;
    const draft: Record<string, string> = {};
    const ready: Record<string, string> = {};
    for (const p of products) {
      draft[p.id] = String(
        quantities[`${p.id}:${date}`] ?? DEFAULT_DAILY_QUANTITY
      );
      ready[p.id] = String(readyQuantities[`${p.id}:${date}`] ?? 0);
    }
    setQtyDraft(draft);
    setReadyDraft(ready);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setQtyDraft({});
    setReadyDraft({});
    setIsEditing(false);
  };

  const resetDefaults = () => {
    if (!date) return;
    const draft: Record<string, string> = {};
    for (const p of products) {
      const ordered = orderCounts[`${p.id}:${date}`] ?? 0;
      const val = Math.max(DEFAULT_DAILY_QUANTITY, ordered);
      draft[p.id] = String(val);
      onQtyChange(p.id, date, val);
    }
    setQtyDraft(draft);
    onApplyDefault(date);
  };

  const handleSave = async () => {
    if (!date) return;
    const dayLimits: Record<string, number> = {};
    const dayReadyLimits: Record<string, number> = {};
    for (const p of products) {
      const ordered = orderCounts[`${p.id}:${date}`] ?? 0;
      const minAvail = minAvailableStock(ordered);
      const fallback =
        quantities[`${p.id}:${date}`] ?? DEFAULT_DAILY_QUANTITY;
      const val = parseQty(qtyDraft[p.id] ?? String(fallback), minAvail, fallback);

      const readyKey = `${p.id}:${date}`;
      const committed =
        (readyCounts[readyKey]?.reserved ?? 0) +
        (readyCounts[readyKey]?.fulfilled ?? 0);
      const readyFallback = readyQuantities[readyKey] ?? 0;
      const readyRaw = readyDraft[p.id] ?? String(readyFallback);
      const readyParsed = parseQty(readyRaw, committed, readyFallback);
      const readyVal = Math.min(Math.max(committed, readyParsed), val);

      dayLimits[p.id] = val;
      dayReadyLimits[p.id] = readyVal;
      onQtyChange(p.id, date, val);
      onReadyChange(p.id, date, readyVal);
    }
    await onSaveDay(date, dayLimits, dayReadyLimits);
    setQtyDraft({});
    setReadyDraft({});
    setIsEditing(false);
  };

  if (!date) return null;

  const daySlots = slots
    .filter((s) => s.slot_date === date)
    .sort((a, b) => a.window_start.localeCompare(b.window_start));

  const activeSlots = daySlots.filter((s) => s.is_active).length;
  const dayClosed = isDayClosed(date, closedDates, slots);

  const productRows = products.map((p) => {
    const key = `${p.id}:${date}`;
    const available = quantities[key] ?? DEFAULT_DAILY_QUANTITY;
    const ordered = orderCounts[key] ?? 0;
    const remaining = getRemaining(available, ordered);
    const readySet = readyQuantities[key] ?? 0;
    const readyCommitted =
      (readyCounts[key]?.reserved ?? 0) + (readyCounts[key]?.fulfilled ?? 0);
    const readyLeft = getReadyAvailable(
      readySet,
      readyCounts[key]?.reserved ?? 0,
      readyCounts[key]?.fulfilled ?? 0
    );
    return {
      product: p,
      available,
      ordered,
      remaining,
      readySet,
      readyCommitted,
      readyLeft,
    };
  });

  const totalAvailable = productRows.reduce((s, r) => s + r.available, 0);
  const totalOrdered = productRows.reduce((s, r) => s + r.ordered, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-[#F5E6D3] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#4B2C20]/10 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#4B2C20]/50">
              {isEditing ? "Edit day" : "Day overview"}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-[#4B2C20]">
              {formatDayFull(date)}
            </h2>
            {!isEditing && (
              <p className="mt-1 text-xs text-[#4B2C20]/50">
                {dayClosed
                  ? "Store closed"
                  : `${activeSlots}/${daySlots.length} windows · ${totalOrdered}/${totalAvailable} units ordered`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => (isEditing ? cancelEditing() : startEditing())}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5E6D3] text-[#4B2C20] transition hover:bg-[#4B2C20]/10"
              title={isEditing ? "View mode" : "Edit"}
            >
              {isEditing ? <Eye size={18} /> : <Pencil size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5E6D3]"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Store status */}
          <section className="rounded-xl bg-white p-4 ring-1 ring-[#4B2C20]/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#4B2C20]">
                  Store status
                </h3>
                <p
                  className={`mt-1 text-xs font-medium ${
                    dayClosed ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {dayClosed ? "Closed for deliveries" : "Open for deliveries"}
                </p>
                {dayClosed && daySlots.length > 0 && activeSlots === 0 && (
                  <p className="mt-1 text-[10px] text-[#4B2C20]/50">
                    All delivery windows are off
                  </p>
                )}
              </div>
              {daySlots.length > 0 && (
                <button
                  type="button"
                  disabled={closingDay}
                  onClick={async () => {
                    setCloseError(null);
                    if (dayClosed) {
                      await onOpenDay(date);
                      return;
                    }
                    const error = await onCloseDay(date);
                    if (error) setCloseError(error);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
                    dayClosed
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                  }`}
                >
                  {dayClosed ? (
                    <>
                      <LockOpen size={14} />
                      Open day
                    </>
                  ) : (
                    <>
                      <Store size={14} />
                      Close day
                    </>
                  )}
                </button>
              )}
            </div>
            {closeError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
                {closeError}
              </p>
            )}
          </section>

          {/* Delivery windows */}
          <section>
            <h3 className="text-sm font-semibold text-[#4B2C20]">
              Delivery windows
            </h3>
            {daySlots.length === 0 ? (
              <p className="mt-2 text-xs text-[#4B2C20]/50">
                No windows for this day. Generate the week from the calendar.
              </p>
            ) : isEditing ? (
              <div className="mt-3 space-y-2">
                {daySlots.map((slot) => {
                  const label = `${slot.window_start.slice(0, 5)} – ${slot.window_end.slice(0, 5)}`;
                  return (
                    <div
                      key={slot.id}
                      className="rounded-xl bg-white p-3 ring-1 ring-[#4B2C20]/10"
                    >
                      <ConfirmSwitch
                        compact
                        active={slot.is_active}
                        label={label}
                        disabled={togglingSlotId === slot.id}
                        confirmOn={`Enable ${label}?`}
                        confirmOff={`Disable ${label}? Customers won't see this slot.`}
                        onToggle={(next) => onSlotToggle(slot, next)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {daySlots.map((slot) => {
                  const label = `${slot.window_start.slice(0, 5)} – ${slot.window_end.slice(0, 5)}`;
                  return (
                    <div
                      key={slot.id}
                      className={`rounded-xl px-3 py-2.5 text-sm ring-1 ${
                        slot.is_active
                          ? "bg-white ring-emerald-200"
                          : "bg-gray-50 ring-gray-200 opacity-70"
                      }`}
                    >
                      <p className="font-medium text-[#4B2C20]">{label}</p>
                      <p
                        className={`mt-0.5 text-[10px] font-medium ${
                          slot.is_active ? "text-emerald-600" : "text-gray-500"
                        }`}
                      >
                        {slot.is_active ? "Open" : "Closed"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Products */}
          <section>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#4B2C20]">
                  Product stock
                </h3>
                {isEditing && (
                  <p className="mt-0.5 text-[10px] text-[#4B2C20]/50">
                    Set daily availability and ready units for the next delivery window
                  </p>
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetDefaults}
                  className="text-xs font-medium text-[#4B2C20] underline-offset-2 hover:underline"
                >
                  Reset all to {DEFAULT_DAILY_QUANTITY}
                </button>
              )}
            </div>

            {products.length === 0 ? (
              <p className="mt-2 text-xs text-[#4B2C20]/50">No products yet.</p>
            ) : isEditing ? (
              <div className="mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-[#4B2C20]/10">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 border-b border-[#4B2C20]/10 bg-[#F5E6D3]/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50">
                  <span>Product</span>
                  <span className="w-14 text-center">Avail</span>
                  <span className="w-14 text-center">Ready</span>
                  <span className="w-10 text-center">Sold</span>
                  <span className="w-10 text-center">Left</span>
                </div>
                <ul className="divide-y divide-[#4B2C20]/5">
                  {productRows.map(({ product, available, ordered }) => {
                    const minAvail = minAvailableStock(ordered);
                    const draftRaw =
                      qtyDraft[product.id] ?? String(available);
                    const draftAvailable = parseQty(
                      draftRaw,
                      minAvail,
                      available
                    );
                    const draftRemaining = getRemaining(
                      draftAvailable,
                      ordered
                    );
                    const readyKey = `${product.id}:${date}`;
                    const readyCommitted =
                      (readyCounts[readyKey]?.reserved ?? 0) +
                      (readyCounts[readyKey]?.fulfilled ?? 0);
                    const readyFallback = readyQuantities[readyKey] ?? 0;
                    const readyRaw =
                      readyDraft[product.id] ?? String(readyFallback);
                    parseQty(readyRaw, readyCommitted, readyFallback);
                    return (
                      <li
                        key={product.id}
                        className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[#F5E6D3]">
                            <Image
                              src={product.image_path || "/hero-tiramisu.png"}
                              alt={product.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="truncate text-sm text-[#4B2C20]">
                            {product.title}
                          </span>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={draftRaw}
                          onChange={(e) =>
                            setQtyDraft((prev) => ({
                              ...prev,
                              [product.id]: e.target.value.replace(
                                /[^\d]/g,
                                ""
                              ),
                            }))
                          }
                          aria-label={`Available count for ${product.title}`}
                          className="w-14 rounded-lg border border-[#4B2C20]/20 bg-[#F5E6D3]/30 px-1 py-1 text-center text-sm tabular-nums text-[#4B2C20] focus:border-[#4B2C20]/40 focus:outline-none focus:ring-1 focus:ring-[#4B2C20]/20"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={readyRaw}
                          onChange={(e) =>
                            setReadyDraft((prev) => ({
                              ...prev,
                              [product.id]: e.target.value.replace(
                                /[^\d]/g,
                                ""
                              ),
                            }))
                          }
                          aria-label={`Ready count for ${product.title}`}
                          className="w-14 rounded-lg border border-emerald-200 bg-emerald-50/50 px-1 py-1 text-center text-sm tabular-nums text-[#4B2C20] focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                        />
                        <span className="w-10 text-center text-sm tabular-nums text-[#4B2C20]/70">
                          {ordered}
                        </span>
                        <span
                          className={`w-10 text-center text-sm font-semibold tabular-nums ${
                            draftRemaining === 0
                              ? "text-red-600"
                              : draftRemaining <= 5
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }`}
                        >
                          {draftRemaining}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 border-t border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-3 py-2 text-xs font-medium text-[#4B2C20]">
                  <span>Total</span>
                  <span className="w-14 text-center tabular-nums">
                    {productRows.reduce((sum, { product, available }) => {
                      const ordered = orderCounts[`${product.id}:${date}`] ?? 0;
                      const minAvail = minAvailableStock(ordered);
                      return (
                        sum +
                        parseQty(
                          qtyDraft[product.id] ?? String(available),
                          minAvail,
                          available
                        )
                      );
                    }, 0)}
                  </span>
                  <span className="w-14 text-center tabular-nums">
                    {productRows.reduce((sum, { product }) => {
                      const readyKey = `${product.id}:${date}`;
                      const readyCommitted =
                        (readyCounts[readyKey]?.reserved ?? 0) +
                        (readyCounts[readyKey]?.fulfilled ?? 0);
                      const readyFallback = readyQuantities[readyKey] ?? 0;
                      const ordered = orderCounts[readyKey] ?? 0;
                      const minAvail = minAvailableStock(ordered);
                      const avail = parseQty(
                        qtyDraft[product.id] ??
                          String(quantities[readyKey] ?? DEFAULT_DAILY_QUANTITY),
                        minAvail,
                        quantities[readyKey] ?? DEFAULT_DAILY_QUANTITY
                      );
                      const readyParsed = parseQty(
                        readyDraft[product.id] ?? String(readyFallback),
                        readyCommitted,
                        readyFallback
                      );
                      return (
                        sum +
                        Math.min(Math.max(readyCommitted, readyParsed), avail)
                      );
                    }, 0)}
                  </span>
                  <span className="w-10 text-center tabular-nums">{totalOrdered}</span>
                  <span className="w-10 text-center tabular-nums">
                    {getRemaining(
                      productRows.reduce((sum, { product, available }) => {
                        const ordered =
                          orderCounts[`${product.id}:${date}`] ?? 0;
                        const minAvail = minAvailableStock(ordered);
                        return (
                          sum +
                          parseQty(
                            qtyDraft[product.id] ?? String(available),
                            minAvail,
                            available
                          )
                        );
                      }, 0),
                      totalOrdered
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-[#4B2C20]/10">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 border-b border-[#4B2C20]/10 bg-[#F5E6D3]/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50">
                  <span>Product</span>
                  <span className="w-10 text-center">Avail</span>
                  <span className="w-16 text-center">Ready</span>
                  <span className="w-10 text-center">Sold</span>
                  <span className="w-10 text-center">Left</span>
                </div>
                <ul className="divide-y divide-[#4B2C20]/5">
                  {productRows.map(
                    ({
                      product,
                      available,
                      ordered,
                      remaining,
                      readySet,
                      readyLeft,
                    }) => (
                    <li
                      key={product.id}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[#F5E6D3]">
                          <Image
                            src={product.image_path || "/hero-tiramisu.png"}
                            alt={product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="truncate text-sm text-[#4B2C20]">
                          {product.title}
                        </span>
                      </div>
                      <span className="w-10 text-center text-sm tabular-nums text-[#4B2C20]">
                        {available}
                      </span>
                      <span className="w-16 text-center text-xs tabular-nums text-emerald-700">
                        {readySet > 0 ? `${readyLeft}/${readySet}` : "—"}
                      </span>
                      <span className="w-10 text-center text-sm tabular-nums text-[#4B2C20]/70">
                        {ordered}
                      </span>
                      <span
                        className={`w-10 text-center text-sm font-semibold tabular-nums ${
                          remaining === 0
                            ? "text-red-600"
                            : remaining <= 5
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }`}
                      >
                        {remaining}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-t border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-3 py-2 text-xs font-medium text-[#4B2C20]">
                  <span>Total</span>
                  <span className="w-10 text-center tabular-nums">{totalAvailable}</span>
                  <span className="w-10 text-center tabular-nums">{totalOrdered}</span>
                  <span className="w-10 text-center tabular-nums">
                    {getRemaining(totalAvailable, totalOrdered)}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>

        {isEditing && (
          <footer className="border-t border-[#4B2C20]/10 bg-white p-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="flex-1 rounded-full border border-[#4B2C20]/20 py-3 text-sm font-medium text-[#4B2C20]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#4B2C20] py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}
