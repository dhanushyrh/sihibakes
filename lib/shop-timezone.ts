/** Shop operates in India — slot windows and booking cutoffs use this timezone. */
export const SHOP_TIMEZONE = "Asia/Kolkata";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date (yyyy-MM-dd) in the shop timezone. */
export function shopDateKey(now = new Date()): string {
  return dateKeyFormatter.format(now);
}

/** Add calendar days in the shop timezone. */
export function shopDatePlusDays(days: number, now = new Date()): string {
  const anchor = shopWallClockToDate(shopDateKey(now), "12:00:00");
  anchor.setTime(anchor.getTime() + days * 24 * 60 * 60 * 1000);
  return shopDateKey(anchor);
}

/** Combine a shop calendar date with a wall-clock time (HH:mm) in IST. */
export function shopWallClockToDate(dateKey: string, time: string): Date {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  const hh = String(h ?? 0).padStart(2, "0");
  const mm = String(m ?? 0).padStart(2, "0");
  return new Date(`${dateKey}T${hh}:${mm}:00+05:30`);
}

export function isShopToday(dateKey: string, now = new Date()): boolean {
  return normalizeShopDateKey(dateKey) === shopDateKey(now);
}

export function isShopTomorrow(dateKey: string, now = new Date()): boolean {
  return normalizeShopDateKey(dateKey) === shopDatePlusDays(1, now);
}

export function normalizeShopDateKey(date: string): string {
  return date.trim().slice(0, 10);
}
