import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { ADMIN_ORDER_LIST_SELECT } from "@/lib/admin-orders-query";
import { buildKitchenBoard, type KitchenOrder } from "@/lib/kitchen";
import { KITCHEN_ORDERS_VISIBLE_OR } from "@/lib/offline-orders";
import { shopDateKey } from "@/lib/shop-timezone";
import { createAdminClient } from "@/lib/supabase/admin";

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date")?.trim() || shopDateKey();
  if (!isDateKey(dateParam)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select(ADMIN_ORDER_LIST_SELECT)
    .or(KITCHEN_ORDERS_VISIBLE_OR)
    .eq("delivery_date", dateParam)
    .neq("status", "cancelled")
    .order("delivery_window_start", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = (data ?? []) as KitchenOrder[];
  const board = buildKitchenBoard(dateParam, orders);

  return NextResponse.json({
    date: dateParam,
    orders,
    board,
    orderCount: orders.length,
  });
}
