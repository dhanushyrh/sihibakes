import type { CouponType } from "@/lib/types";

type PublicCoupon = {
  code: string;
  type: CouponType;
  value_inr: number;
  min_subtotal_inr: number;
  first_order_only: boolean;
};

export function describeCoupon(coupon: PublicCoupon): string {
  const min =
    coupon.min_subtotal_inr > 0 ? ` · min order ₹${coupon.min_subtotal_inr}` : "";
  const first = coupon.first_order_only ? " · first order only" : "";

  switch (coupon.type) {
    case "fixed_subtotal":
      return `₹${coupon.value_inr} off${min}${first}`;
    case "fixed_delivery":
      return `₹${coupon.value_inr} off delivery${min}${first}`;
    case "free_delivery":
      return `Free delivery${min}${first}`;
    case "percent_subtotal":
      return `${coupon.value_inr}% off${min}${first}`;
    default:
      return coupon.code;
  }
}
