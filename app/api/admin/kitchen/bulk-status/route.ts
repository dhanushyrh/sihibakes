import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { ADMIN_ORDER_LIST_SELECT } from "@/lib/admin-orders-query";
import { KITCHEN_ORDERS_VISIBLE_OR } from "@/lib/offline-orders";
import { canTransitionOrderStatus } from "@/lib/order-status-transitions";
import { notifyOrderStatusChange } from "@/lib/whatsapp/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/types";

const BULK_TARGETS = new Set<OrderStatus>(["confirmed", "preparing"]);

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeKey(value: string): boolean {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

/**
 * Bulk-advance kitchen statuses for one delivery slot.
 * Supports: pending → confirmed, confirmed → preparing.
 * Does not handle dispatch (needs per-order delivery details).
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as {
    date?: string;
    window_start?: string;
    window_end?: string;
    status?: OrderStatus;
  };

  const date = body.date?.trim() ?? "";
  const windowStart = body.window_start?.trim() ?? "";
  const windowEnd = body.window_end?.trim() ?? "";
  const status = body.status;

  if (!isDateKey(date) || !isTimeKey(windowStart) || !isTimeKey(windowEnd)) {
    return NextResponse.json(
      { error: "date, window_start, and window_end are required" },
      { status: 400 }
    );
  }

  if (!status || !BULK_TARGETS.has(status)) {
    return NextResponse.json(
      { error: "status must be confirmed or preparing" },
      { status: 400 }
    );
  }

  const fromStatus: OrderStatus = status === "confirmed" ? "pending" : "confirmed";
  const admin = createAdminClient();

  const { data: orders, error } = await admin
    .from("orders")
    .select("id, status, payment_status, order_source")
    .or(KITCHEN_ORDERS_VISIBLE_OR)
    .eq("delivery_date", date)
    .eq("delivery_window_start", normalizeTime(windowStart))
    .eq("delivery_window_end", normalizeTime(windowEnd))
    .eq("status", fromStatus);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const eligible = (orders ?? []).filter((order) => {
    const transition = canTransitionOrderStatus(
      order.status as OrderStatus,
      status,
      order.payment_status,
      order.order_source
    );
    return transition.ok;
  });

  if (eligible.length === 0) {
    return NextResponse.json({ updated: 0, orders: [] });
  }

  const ids = eligible.map((o) => o.id);
  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update({ status })
    .in("id", ids)
    .select(ADMIN_ORDER_LIST_SELECT);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  for (const id of ids) {
    void notifyOrderStatusChange(id, status);
  }

  return NextResponse.json({
    updated: updated?.length ?? 0,
    orders: updated ?? [],
  });
}
