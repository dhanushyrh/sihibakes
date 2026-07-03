import {
  addDays,
  format,
  isBefore,
  isToday,
  startOfDay,
  parseISO,
} from "date-fns";

export const DEFAULT_DELIVERY_WINDOWS = [
  { start: "11:00", end: "13:00" },
  { start: "16:00", end: "18:00" },
  { start: "20:00", end: "22:00" },
] as const;

/** Weeks ahead admin can plan (0 = current week starting today). */
export const MAX_WEEK_OFFSET = 3;

export function getTodayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Planning calendar starts from today. */
export function getPlanningAnchor(): Date {
  return startOfDay(new Date());
}

export function getWeekDates(weekOffset: number): string[] {
  const anchor = getPlanningAnchor();
  const weekStart = addDays(anchor, weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), "yyyy-MM-dd")
  );
}

/** Consecutive dates starting from today (inclusive). */
export function getDatesFromToday(dayCount: number): string[] {
  const anchor = getPlanningAnchor();
  return Array.from({ length: dayCount }, (_, i) =>
    format(addDays(anchor, i), "yyyy-MM-dd")
  );
}

export const GENERATE_WEEKS_AHEAD = 4;

export function getWeekLabel(weekOffset: number): string {
  const dates = getWeekDates(weekOffset);
  const start = parseISO(dates[0]);
  const end = parseISO(dates[6]);
  const today = getTodayDate();
  if (weekOffset === 0 && dates[0] === today) {
    return `Today – ${format(end, "d MMM yyyy")}`;
  }
  return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

export function isPastDate(dateStr: string): boolean {
  return isBefore(parseISO(dateStr), getPlanningAnchor());
}

export function isTodayDate(dateStr: string): boolean {
  return isToday(parseISO(dateStr));
}

export function formatDayHeader(dateStr: string): string {
  if (isTodayDate(dateStr)) return "Today";
  return format(parseISO(dateStr), "EEE");
}

export function formatDayNumber(dateStr: string): string {
  return format(parseISO(dateStr), "d");
}

export function formatDayFull(dateStr: string): string {
  if (isTodayDate(dateStr)) {
    return `Today, ${format(parseISO(dateStr), "d MMMM yyyy")}`;
  }
  return format(parseISO(dateStr), "EEEE, d MMMM yyyy");
}
