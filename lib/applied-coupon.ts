export const COUPON_STORAGE_KEY = "sihi-applied-coupon";

export type AppliedCoupon = {
  code: string;
  discount_inr: number;
  free_delivery: boolean;
};

export function readAppliedCoupon(): AppliedCoupon | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COUPON_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppliedCoupon) : null;
  } catch {
    return null;
  }
}

export function writeAppliedCoupon(coupon: AppliedCoupon | null) {
  if (typeof window === "undefined") return;
  if (coupon) {
    sessionStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon));
  } else {
    sessionStorage.removeItem(COUPON_STORAGE_KEY);
  }
}
