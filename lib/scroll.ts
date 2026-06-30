/** Scroll the document to the top (instant, not smooth). */
export function scrollPageToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

export const CHECKOUT_FIELD_ORDER = [
  "customerName",
  "email",
  "altPhone",
  "location",
  "house",
  "street",
  "pincode",
  "slot",
] as const;

export type CheckoutFieldKey = (typeof CHECKOUT_FIELD_ORDER)[number];

/** Scroll to and focus the first invalid checkout field (top-to-bottom order). */
export function scrollToFirstCheckoutError(errors: Record<string, string>): void {
  if (typeof window === "undefined") return;

  const firstKey = CHECKOUT_FIELD_ORDER.find((key) => errors[key]);
  if (!firstKey) return;

  const el = document.querySelector(`[data-checkout-field="${firstKey}"]`);
  if (!(el instanceof HTMLElement)) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  const focusable = el.querySelector<HTMLElement>(
    "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
  );
  focusable?.focus({ preventScroll: true });
}
