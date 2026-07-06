/** Pre-orders splash is shown on the orders hub through end of 11 July 2026 IST. */
export const PRE_ORDERS_SPLASH_ENDS_AT = "2026-07-11T23:59:59+05:30";

export function isPreOrdersSplashActive(now = new Date()): boolean {
  return now <= new Date(PRE_ORDERS_SPLASH_ENDS_AT);
}
