import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFirstOrder } from "@/lib/data";
import { applyCoupon } from "@/lib/pricing";
import type { Coupon } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { code, phone, subtotal, delivery_fee_inr } = await request.json();

    if (!code || !phone || typeof subtotal !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: coupon } = await admin
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .single();

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        discount_inr: 0,
        free_delivery: false,
        message: "Invalid coupon code",
      });
    }

    const firstOrder = await isFirstOrder(phone);
    const result = applyCoupon(
      coupon as Coupon,
      subtotal,
      delivery_fee_inr ?? 0,
      firstOrder
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
