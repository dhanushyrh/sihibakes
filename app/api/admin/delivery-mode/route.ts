import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { ADMIN_ORDER_LIST_SELECT } from "@/lib/admin-orders-query";
import { SELF_DELIVERY_VENDOR } from "@/lib/order-status-update";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

/** Self-delivery stops currently out for delivery. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select(ADMIN_ORDER_LIST_SELECT)
    .eq("status", "out_for_delivery")
    .eq("delivery_vendor", SELF_DELIVERY_VENDOR)
    .order("delivery_date", { ascending: true })
    .order("delivery_window_start", { ascending: true })
    .order("out_for_delivery_at", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = (data ?? []) as Order[];
  return NextResponse.json({
    orders,
    count: orders.length,
  });
}
