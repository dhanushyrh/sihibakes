import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { notifyOrderStatusChange } from "@/lib/whatsapp/notifications";
import { canCancelOrderStatus } from "@/lib/order-status-transitions";
import { ADMIN_ORDER_LIST_SELECT } from "@/lib/admin-orders-query";
import type { OrderStatus } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!notes) {
    return NextResponse.json(
      { error: "Cancellation notes are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("status, payment_status")
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "cancelled") {
    return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 });
  }

  if (!canCancelOrderStatus(order.status as OrderStatus)) {
    return NextResponse.json(
      { error: "Only pending orders can be cancelled from here" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("orders")
    .update({
      status: "cancelled",
      cancellation_notes: notes,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ADMIN_ORDER_LIST_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void notifyOrderStatusChange(id, "cancelled");

  return NextResponse.json(data);
}
