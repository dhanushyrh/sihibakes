import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Coupon } from "@/lib/types";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("coupons")
      .select("code, type, value_inr, min_subtotal_inr, first_order_only, valid_from, valid_until")
      .eq("is_active", true)
      .order("code");

    if (error) {
      return NextResponse.json({ error: "Could not load coupons" }, { status: 500 });
    }

    const now = new Date();
    const coupons = (data as Coupon[]).filter((coupon) => {
      if (coupon.valid_from && new Date(coupon.valid_from) > now) return false;
      if (coupon.valid_until && new Date(coupon.valid_until) < now) return false;
      return true;
    });

    return NextResponse.json(coupons);
  } catch {
    return NextResponse.json({ error: "Could not load coupons" }, { status: 500 });
  }
}
