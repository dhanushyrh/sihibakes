"use client";

import type { DeliverySlot, Product } from "@/lib/types";
import { DEFAULT_DAILY_QUANTITY, isDayFullySoldOut } from "@/lib/inventory";
import { isDayClosed } from "@/lib/delivery-day";
import {
  formatDayHeader,
  formatDayNumber,
  getWeekDates,
  getWeekLabel,
  isPastDate,
  isTodayDate,
} from "@/lib/calendar-week";
import { ChevronLeft, ChevronRight, Clock, Package } from "lucide-react";

interface StockCalendarProps {
  weekOffset: number;
  maxWeekOffset: number;
  onWeekChange: (offset: number) => void;
  slots: DeliverySlot[];
  products: Product[];
  quantities: Record<string, number>;
  orderCounts: Record<string, number>;
  closedDates: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export function StockCalendar({
  weekOffset,
  maxWeekOffset,
  onWeekChange,
  slots,
  products,
  quantities,
  orderCounts,
  closedDates,
  selectedDate,
  onSelectDate,
}: StockCalendarProps) {
  const weekDates = getWeekDates(weekOffset);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#4B2C20]/10 overflow-hidden">
      {/* Week navigation */}
      <div className="flex items-center justify-between border-b border-[#4B2C20]/10 px-4 py-3">
        <button
          type="button"
          disabled={weekOffset <= 0}
          onClick={() => onWeekChange(weekOffset - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F5E6D3] disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#4B2C20]">
            {getWeekLabel(weekOffset)}
          </p>
          <p className="text-[10px] text-[#4B2C20]/50">
            Week {weekOffset + 1} of {maxWeekOffset + 1}
          </p>
        </div>
        <button
          type="button"
          disabled={weekOffset >= maxWeekOffset}
          onClick={() => onWeekChange(weekOffset + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F5E6D3] disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#4B2C20]/10 bg-[#F5E6D3]/30">
        {weekDates.map((date) => (
          <div
            key={date}
            className="py-2 text-center text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50"
          >
            {formatDayHeader(date)}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 divide-x divide-[#4B2C20]/5">
        {weekDates.map((date) => {
          const daySlots = slots.filter((s) => s.slot_date === date);
          const activeSlots = daySlots.filter((s) => s.is_active).length;
          const totalSlots = daySlots.length;
          const totalUnits = products.reduce(
            (sum, p) => sum + (quantities[`${p.id}:${date}`] ?? DEFAULT_DAILY_QUANTITY),
            0
          );
          const totalOrdered = products.reduce(
            (sum, p) => sum + (orderCounts[`${p.id}:${date}`] ?? 0),
            0
          );
          const past = isPastDate(date);
          const selected = selectedDate === date;
          const today = isTodayDate(date);
          const closed = isDayClosed(date, closedDates, slots);
          const soldOut =
            !past &&
            !closed &&
            products.length > 0 &&
            isDayFullySoldOut(products, quantities, orderCounts, date);

          return (
            <button
              key={date}
              type="button"
              disabled={past}
              onClick={() => onSelectDate(date)}
              className={`min-h-[120px] p-2 text-left transition sm:min-h-[140px] sm:p-3 ${
                past
                  ? "cursor-not-allowed bg-gray-50 opacity-40"
                  : closed
                    ? "bg-red-50/80"
                    : soldOut
                      ? "bg-amber-50/90"
                      : selected
                        ? "bg-[#4B2C20]/10 ring-2 ring-inset ring-[#4B2C20]"
                        : "hover:bg-[#F5E6D3]/40"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    today
                      ? "bg-[#4B2C20] text-white"
                      : "text-[#4B2C20]"
                  }`}
                >
                  {formatDayNumber(date)}
                </span>
                {today && !closed && !soldOut && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                    Today
                  </span>
                )}
                {closed && !past && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                    Closed
                  </span>
                )}
                {soldOut && (
                  <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-semibold text-amber-900">
                    Sold out
                  </span>
                )}
              </div>

              {!past && (
                <div className="mt-2 space-y-1.5">
                  {closed ? (
                    <p className="text-[10px] font-medium text-red-600/80">
                      Store closed
                    </p>
                  ) : soldOut ? (
                    <p className="text-[10px] font-medium text-amber-800/90">
                      All items sold out
                    </p>
                  ) : (
                    <>
                  <div className="flex items-center gap-1 text-[10px] text-[#4B2C20]/70">
                    <Clock size={10} className="shrink-0" />
                    {totalSlots === 0 ? (
                      <span className="text-[#4B2C20]/40">No slots</span>
                    ) : (
                      <span>
                        {activeSlots}/{totalSlots} windows
                      </span>
                    )}
                  </div>
                  {/* Slot dots */}
                  {totalSlots > 0 && (
                    <div className="flex gap-0.5">
                      {daySlots.map((s) => (
                        <span
                          key={s.id}
                          className={`h-1.5 flex-1 rounded-full ${
                            s.is_active ? "bg-emerald-500" : "bg-[#4B2C20]/15"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-[#4B2C20]/70">
                    <Package size={10} className="shrink-0" />
                    <span>
                      {products.length > 0
                        ? `${totalOrdered}/${totalUnits} sold`
                        : "—"}
                    </span>
                  </div>
                    </>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-[#4B2C20]/10 bg-[#F5E6D3]/20 px-4 py-2.5 text-[10px] text-[#4B2C20]/60">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-emerald-500" /> Active window
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-[#4B2C20]/15" /> Off
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-red-200" /> Closed day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-amber-200" /> Sold out
        </span>
        <span>Tap a day to view · pencil icon to edit</span>
      </div>
    </div>
  );
}
