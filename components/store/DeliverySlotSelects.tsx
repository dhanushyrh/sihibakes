"use client";

import { useEffect, useMemo, useRef } from "react";
import { format, parseISO } from "date-fns";
import { CalendarClock, Check, Clock3 } from "lucide-react";
import {
  getBookableDates,
  getDateStripEntries,
  getSlotsForBookableDate,
  type DeliveryMode,
  type SlotBookableVia,
} from "@/lib/customer-delivery-slots";
import { isShopToday, isShopTomorrow } from "@/lib/shop-timezone";
import type { DeliverySlot } from "@/lib/types";

type DeliverySlotSelectsProps = {
  slots: DeliverySlot[];
  selectedDate: string;
  selectedSlotId: string;
  onDateChange: (date: string) => void;
  onSlotChange: (slotId: string) => void;
  deliveryMode?: DeliveryMode | null;
  slotBookability?: Map<string, SlotBookableVia>;
  dateError?: string;
  slotError?: string;
  emptyDatesMessage?: string;
  /** @deprecated Custom classes — layout is fixed for consistent UX */
  selectClassName?: string;
  /** @deprecated Custom classes — layout is fixed for consistent UX */
  labelClassName?: string;
};

function formatTime12(time: string): string {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return format(d, "h:mm a");
}

function formatSlotRange(slot: DeliverySlot): string {
  return `${formatTime12(slot.window_start)} – ${formatTime12(slot.window_end)}`;
}

function dateChipMeta(dateKey: string) {
  const date = parseISO(dateKey);
  if (isShopToday(dateKey)) {
    return { headline: "Today", weekday: format(date, "EEE"), day: format(date, "d"), month: format(date, "MMM") };
  }
  if (isShopTomorrow(dateKey)) {
    return { headline: "Tomorrow", weekday: format(date, "EEE"), day: format(date, "d"), month: format(date, "MMM") };
  }
  return {
    headline: format(date, "EEE"),
    weekday: format(date, "EEE"),
    day: format(date, "d"),
    month: format(date, "MMM"),
  };
}

function selectionSummary(
  selectedDate: string,
  selectedSlot: DeliverySlot | undefined
): string {
  if (!selectedDate) return "Choose a day and time";
  const date = parseISO(selectedDate);
  const dateLabel = isShopToday(selectedDate)
    ? "Today"
    : isShopTomorrow(selectedDate)
      ? "Tomorrow"
      : format(date, "EEE, d MMM");
  if (!selectedSlot) return dateLabel;
  return `${dateLabel} · ${formatSlotRange(selectedSlot)}`;
}

export function DeliverySlotSelects({
  slots,
  selectedDate,
  selectedSlotId,
  onDateChange,
  onSlotChange,
  deliveryMode = null,
  slotBookability,
  dateError,
  slotError,
  emptyDatesMessage = "No delivery dates available right now.",
}: DeliverySlotSelectsProps) {
  const dateStripRef = useRef<HTMLDivElement>(null);
  const selectedDateRef = useRef<HTMLButtonElement>(null);

  const availableDates = useMemo(() => getBookableDates(slots), [slots]);
  const dateStripEntries = useMemo(() => {
    if (deliveryMode === "same_day") return [];
    if (deliveryMode === "pre_order") {
      return availableDates.map((date) => ({ date, bookable: true }));
    }
    const entries = getDateStripEntries(slots);
    const bookable = new Set(availableDates);
    return entries.filter((entry) => bookable.has(entry.date));
  }, [slots, deliveryMode, availableDates]);
  const slotsForDate = useMemo(
    () => getSlotsForBookableDate(slots, selectedDate),
    [slots, selectedDate]
  );
  const selectedSlot = slotsForDate.find((slot) => slot.id === selectedSlotId);

  const handleDateChange = (date: string) => {
    onDateChange(date);
    const nextSlots = getSlotsForBookableDate(slots, date);
    onSlotChange(nextSlots[0]?.id ?? "");
  };

  useEffect(() => {
    const strip = dateStripRef.current;
    const chip = selectedDateRef.current;
    if (!strip || !chip) return;

    const wrapper = chip.parentElement;
    if (!wrapper) return;

    const left =
      wrapper.offsetLeft - (strip.clientWidth - wrapper.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [selectedDate, dateStripEntries.length]);

  if (!availableDates.length) {
    return (
      <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
        {emptyDatesMessage}
      </p>
    );
  }

  const error = slotError || dateError;
  const isSameDay = deliveryMode === "same_day";
  const headerEyebrow = isSameDay ? "Today's delivery window" : "Pre-order schedule";
  const headerHint = isSameDay
    ? "Pick a time slot for today"
    : "Choose your pre-order date and time";

  return (
    <section
      className="rounded-2xl bg-white ring-1 ring-chocolate/10"
      aria-label="Delivery schedule"
    >
      <div className="border-b border-chocolate/8 bg-gradient-to-br from-parchment/90 via-cream to-white px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-chocolate text-cream shadow-sm">
            <CalendarClock size={20} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-chocolate/45">
              {headerEyebrow}
            </p>
            <p className="font-display text-lg font-semibold leading-snug text-chocolate">
              {selectionSummary(selectedDate, selectedSlot)}
            </p>
            <p className="mt-1 text-xs text-chocolate/50">{headerHint}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {!isSameDay && (
        <div>
          <p className="mb-2.5 text-xs font-medium text-chocolate/55">Choose your pre-order date</p>
          <div
            ref={dateStripRef}
            className="-mx-1 flex gap-1 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Delivery dates"
          >
            {dateStripEntries.map(({ date, bookable }) => {
              const meta = dateChipMeta(date);
              const selected = selectedDate === date;

              if (!bookable) return null;

              return (
                <div key={date} className="shrink-0 snap-center py-1.5">
                  <button
                    ref={selected ? selectedDateRef : undefined}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => handleDateChange(date)}
                    className={`relative flex min-w-[4.75rem] flex-col items-center rounded-2xl px-3.5 py-3 transition-all duration-200 active:scale-[0.97] ${
                      selected
                        ? "bg-chocolate text-cream ring-2 ring-gold/50"
                        : "bg-parchment/70 text-chocolate ring-1 ring-chocolate/10 hover:bg-parchment"
                    }`}
                  >
                    {selected && (
                      <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-gold ring-2 ring-chocolate" />
                    )}
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                      selected ? "text-cream/75" : "text-chocolate/50"
                    }`}
                  >
                    {meta.headline}
                  </span>
                  <span className="font-display text-[1.65rem] font-semibold leading-none">
                    {meta.day}
                  </span>
                  <span
                    className={`mt-0.5 text-[11px] ${
                      selected ? "text-cream/70" : "text-chocolate/45"
                    }`}
                  >
                    {meta.month}
                  </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {isSameDay && selectedDate && (
          <div className="rounded-xl bg-parchment/60 px-4 py-3 ring-1 ring-chocolate/8">
            <p className="text-xs font-medium uppercase tracking-wide text-chocolate/45">
              Delivery date
            </p>
            <p className="mt-1 font-display text-base font-semibold text-chocolate">
              Today · {format(parseISO(selectedDate), "EEEE, d MMMM")}
            </p>
          </div>
        )}

        <div>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-chocolate/55">Pick a time</p>
            {selectedDate && (
              <p className="text-[11px] text-chocolate/40">
                {format(parseISO(selectedDate), "EEEE, d MMMM")}
              </p>
            )}
          </div>

          {slotsForDate.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-parchment/50 px-4 py-4 text-sm text-chocolate/55 ring-1 ring-chocolate/8">
              <Clock3 size={18} className="shrink-0 text-chocolate/35" />
              <p>No slots left for this day — try another date.</p>
            </div>
          ) : (
            <div
              className="grid grid-cols-2 gap-2"
              role="listbox"
              aria-label="Delivery time slots"
            >
              {slotsForDate.map((slot) => {
                const selected = selectedSlotId === slot.id;
                const via = slotBookability?.get(slot.id);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onSlotChange(slot.id)}
                    className={`group relative rounded-xl px-3 py-3.5 text-left transition-all duration-200 active:scale-[0.98] ${
                      selected
                        ? "bg-chocolate text-cream shadow-md ring-2 ring-gold/40"
                        : "bg-cream text-chocolate ring-1 ring-chocolate/10 hover:bg-parchment hover:ring-chocolate/20"
                    }`}
                  >
                    <span className="block text-sm font-semibold leading-tight">
                      {formatTime12(slot.window_start)}
                    </span>
                    <span
                      className={`mt-0.5 block text-[11px] ${
                        selected ? "text-cream/70" : "text-chocolate/45"
                      }`}
                    >
                      until {formatTime12(slot.window_end)}
                    </span>
                    {via === "ready" && (
                      <span
                        className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          selected
                            ? "bg-gold text-chocolate"
                            : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                        }`}
                      >
                        Ready now
                      </span>
                    )}
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-chocolate">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
