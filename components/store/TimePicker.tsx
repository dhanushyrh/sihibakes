"use client";

import { useId, useMemo } from "react";
import { Check, Clock3 } from "lucide-react";
import {
  buildTimeSlots,
  formatTimeDisplay,
} from "@/lib/datetime-picker";

type TimePickerProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

export function TimePicker({
  id: idProp,
  label,
  value,
  onChange,
  startHour = 9,
  endHour = 21,
  intervalMinutes = 30,
  placeholder = "Select a time",
  error,
  disabled = false,
}: TimePickerProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  const slots = useMemo(
    () => buildTimeSlots({ startHour, endHour, intervalMinutes }),
    [startHour, endHour, intervalMinutes]
  );

  const display = formatTimeDisplay(value);

  return (
    <div>
      {label && (
        <label htmlFor={id} className="text-xs text-chocolate/55">
          {label}
        </label>
      )}

      <div
        id={id}
        className={`mt-1 overflow-hidden rounded-2xl bg-white ring-1 ${
          error ? "ring-red-300" : "ring-chocolate/10"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="flex items-center gap-3 border-b border-chocolate/8 bg-gradient-to-br from-parchment/80 to-cream px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chocolate text-cream">
            <Clock3 size={18} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-chocolate/45">
              Event time
            </p>
            <p className="font-display text-base font-semibold text-chocolate">
              {display || placeholder}
            </p>
          </div>
        </div>

        <div
          className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-4"
          role="listbox"
          aria-label="Choose a time"
        >
          {slots.map((slot) => {
            const selected = value === slot;
            return (
              <button
                key={slot}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(slot)}
                className={`relative rounded-xl px-2 py-2.5 text-center text-sm font-medium transition active:scale-[0.98] ${
                  selected
                    ? "bg-chocolate text-cream shadow-md ring-2 ring-gold/40"
                    : "bg-cream text-chocolate ring-1 ring-chocolate/10 hover:bg-parchment"
                }`}
              >
                {formatTimeDisplay(slot)}
                {selected && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-chocolate">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
