import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

export function parseDateValue(value: string): Date | null {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

export function formatDateDisplay(value: string): string {
  const date = parseDateValue(value);
  if (!date) return "";
  return format(date, "EEE, d MMM yyyy");
}

export function formatTimeDisplay(value: string): string {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, "h:mm a");
}

export function isDateDisabled(
  date: Date,
  min?: string,
  max?: string
): boolean {
  const day = startOfDay(date);
  if (min) {
    const minDay = startOfDay(parseISO(min));
    if (isBefore(day, minDay)) return true;
  }
  if (max) {
    const maxDay = startOfDay(parseISO(max));
    if (isAfter(day, maxDay)) return true;
  }
  return false;
}

export type CalendarDay = {
  date: Date;
  key: string;
  inMonth: boolean;
  disabled: boolean;
  isToday: boolean;
  isSelected: boolean;
};

export function buildCalendarMonth(
  month: Date,
  selectedValue: string,
  min?: string,
  max?: string
): CalendarDay[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const selected = parseDateValue(selectedValue);
  const today = startOfDay(new Date());

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
    date,
    key: format(date, "yyyy-MM-dd"),
    inMonth: isSameMonth(date, month),
    disabled: isDateDisabled(date, min, max),
    isToday: isSameDay(date, today),
    isSelected: selected ? isSameDay(date, selected) : false,
  }));
}

export function clampViewMonth(
  month: Date,
  min?: string,
  max?: string
): Date {
  if (min) {
    const minMonth = startOfMonth(parseISO(min));
    if (isBefore(startOfMonth(month), minMonth)) return minMonth;
  }
  if (max) {
    const maxMonth = startOfMonth(parseISO(max));
    if (isAfter(startOfMonth(month), maxMonth)) return maxMonth;
  }
  return month;
}

export function canGoToPrevMonth(month: Date, min?: string): boolean {
  if (!min) return true;
  const prev = subMonths(startOfMonth(month), 1);
  return !isBefore(startOfMonth(prev), startOfMonth(parseISO(min)));
}

export function canGoToNextMonth(month: Date, max?: string): boolean {
  if (!max) return true;
  const next = addMonths(startOfMonth(month), 1);
  return !isAfter(startOfMonth(next), startOfMonth(parseISO(max)));
}

export function buildTimeSlots(options?: {
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
}): string[] {
  const startHour = options?.startHour ?? 9;
  const endHour = options?.endHour ?? 21;
  const intervalMinutes = options?.intervalMinutes ?? 30;
  const slots: string[] = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      if (hour === endHour && minute > 0) break;
      slots.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      );
    }
  }

  return slots;
}
