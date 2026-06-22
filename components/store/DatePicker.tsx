"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  addMonths,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildCalendarMonth,
  canGoToNextMonth,
  canGoToPrevMonth,
  clampViewMonth,
  formatDateDisplay,
  parseDateValue,
} from "@/lib/datetime-picker";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type DatePickerProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

export function DatePicker({
  id: idProp,
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "Select a date",
  error,
  disabled = false,
}: DatePickerProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    clampViewMonth(
      startOfMonth(parseDateValue(value) ?? parseISO(min ?? format(new Date(), "yyyy-MM-dd"))),
      min,
      max
    )
  );

  const days = useMemo(
    () => buildCalendarMonth(viewMonth, value, min, max),
    [viewMonth, value, min, max]
  );

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setViewMonth(
      clampViewMonth(
        startOfMonth(parseDateValue(value) ?? viewMonth),
        min,
        max
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const display = formatDateDisplay(value);

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label htmlFor={id} className="text-xs text-chocolate/55">
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`mt-1 flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-3 text-left text-sm outline-none transition focus:border-chocolate/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? "border-red-300" : "border-chocolate/10"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-parchment text-chocolate">
          <Calendar size={18} strokeWidth={1.75} />
        </span>
        <span className={display ? "font-medium text-chocolate" : "text-chocolate/45"}>
          {display || placeholder}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_-12px_rgba(60,42,33,0.28)] ring-1 ring-chocolate/10"
        >
          <div className="flex items-center justify-between border-b border-chocolate/8 bg-gradient-to-br from-parchment/80 to-cream px-4 py-3">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canGoToPrevMonth(viewMonth, min)}
              onClick={() =>
                setViewMonth((month) =>
                  clampViewMonth(subMonths(month, 1), min, max)
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full text-chocolate transition hover:bg-white disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="font-display text-base font-semibold text-chocolate">
              {format(viewMonth, "MMMM yyyy")}
            </p>
            <button
              type="button"
              aria-label="Next month"
              disabled={!canGoToNextMonth(viewMonth, max)}
              onClick={() =>
                setViewMonth((month) =>
                  clampViewMonth(addMonths(month, 1), min, max)
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full text-chocolate transition hover:bg-white disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="p-3">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-chocolate/40"
                >
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  disabled={day.disabled || !day.inMonth}
                  onClick={() => {
                    onChange(day.key);
                    setOpen(false);
                  }}
                  className={`relative flex h-10 items-center justify-center rounded-xl text-sm transition ${
                    day.isSelected
                      ? "bg-chocolate font-semibold text-cream shadow-sm"
                      : day.isToday
                        ? "bg-gold/20 font-medium text-chocolate ring-1 ring-gold/40"
                        : day.inMonth
                          ? "text-chocolate hover:bg-parchment"
                          : "text-chocolate/20"
                  } disabled:cursor-not-allowed disabled:opacity-30`}
                >
                  {format(day.date, "d")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
