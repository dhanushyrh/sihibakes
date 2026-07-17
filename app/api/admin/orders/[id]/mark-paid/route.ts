import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { ADMIN_ORDER_DETAIL_SELECT } from "@/lib/admin-orders-query";
import { PAYMENT_MODE_SET } from "@/lib/offline-orders";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentMode } from "@/lib/types";

/** Mark an offline order as paid without touching inventory. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    payment_mode?: string;
  };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_source, payment_status, payment_mode, status")
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.order_source !== "offline") {
    return NextResponse.json(
      { error: "Only offline orders can be marked paid this way" },
      { status: 400 }
    );
  }

  if (order.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot mark a cancelled order as paid" },
      { status: 400 }
    );
  }

  if (order.payment_status === "paid") {
    return NextResponse.json(
      { error: "Order is already marked paid" },
      { status: 400 }
    );
  }

  const modeInput = body.payment_mode?.trim() || order.payment_mode;
  if (!PAYMENT_MODE_SET.has(modeInput as PaymentMode)) {
    return NextResponse.json({ error: "Select a payment mode" }, { status: 400 });
  }
  const mode = modeInput as PaymentMode;

  const { data, error } = await admin
    .from("orders")
    .update({
      payment_status: "paid",
      payment_mode: mode,
      razorpay_payment_id: `offline_${mode}_${Date.now()}`,
    })
    .eq("id", id)
    .select(ADMIN_ORDER_DETAIL_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update payment" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
