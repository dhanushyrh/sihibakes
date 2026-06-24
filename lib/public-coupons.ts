import { createAdminClient } from "@/lib/supabase/admin";
import type { Coupon, CouponType } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/mock-data";

export type PublicCoupon = {
  code: string;
  type: CouponType;
  value_inr: number;
  min_subtotal_inr: number;
  first_order_only: boolean;
};

export type EligibleCouponOptions = {
  subtotal: number;
  isFirstOrder?: boolean;
  /** When true, first-order-only coupons require `isFirstOrder`. */
  checkFirstOrder?: boolean;
};

/** Coupons the customer can use right now given cart value and order history. */
export function filterEligiblePublicCoupons(
  coupons: PublicCoupon[],
  { subtotal, isFirstOrder = false, checkFirstOrder = false }: EligibleCouponOptions
): PublicCoupon[] {
  return coupons.filter((coupon) => {
    if (subtotal < coupon.min_subtotal_inr) return false;
    if (coupon.first_order_only) {
      if (!checkFirstOrder || !isFirstOrder) return false;
    }
    return true;
  });
}

export function filterActivePublicCoupons(
  coupons: Pick<
    Coupon,
    | "code"
    | "type"
    | "value_inr"
    | "min_subtotal_inr"
    | "first_order_only"
    | "valid_from"
    | "valid_until"
  >[],
  now = new Date()
): PublicCoupon[] {
  return coupons
    .filter((coupon) => {
      if (coupon.valid_from && new Date(coupon.valid_from) > now) return false;
      if (coupon.valid_until && new Date(coupon.valid_until) < now) return false;
      return true;
    })
    .map((coupon) => ({
      code: coupon.code,
      type: coupon.type,
      value_inr: coupon.value_inr,
      min_subtotal_inr: coupon.min_subtotal_inr,
      first_order_only: coupon.first_order_only,
    }));
}

export async function getActivePublicCoupons(): Promise<PublicCoupon[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        code: "FIRST59",
        type: "fixed_subtotal",
        value_inr: 59,
        min_subtotal_inr: 0,
        first_order_only: true,
      },
      {
        code: "SAVE100",
        type: "fixed_subtotal",
        value_inr: 100,
        min_subtotal_inr: 600,
        first_order_only: false,
      },
      {
        code: "FREEDEL",
        type: "free_delivery",
        value_inr: 0,
        min_subtotal_inr: 1000,
        first_order_only: false,
      },
    ];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .select(
      "code, type, value_inr, min_subtotal_inr, first_order_only, valid_from, valid_until"
    )
    .eq("is_active", true)
    .order("code");

  if (error) throw error;
  return filterActivePublicCoupons((data ?? []) as Coupon[]);
}
