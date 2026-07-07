import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { ADMIN_ORDER_LIST_SELECT } from "@/lib/admin-orders-query";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const refundTxnId =
    typeof body.refund_txn_id === "string" ? body.refund_txn_id.trim() : "";
  const refundAmountInr = Number(body.refund_amount_inr);

  if (!Number.isFinite(refundAmountInr) || refundAmountInr <= 0) {
    return NextResponse.json(
      { error: "A valid refund amount is required" },
      { status: 400 }
    );
  }

  if (!refundTxnId) {
    return NextResponse.json(
      { error: "Transaction ID is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("payment_status, status, total_inr")
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.payment_status === "refunded") {
    return NextResponse.json({ error: "Order is already refunded" }, { status: 400 });
  }

  if (order.status !== "cancelled") {
    return NextResponse.json(
      { error: "Only cancelled orders can be marked as refunded" },
      { status: 400 }
    );
  }

  if (order.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Only paid orders can be marked as refunded" },
      { status: 400 }
    );
  }

  if (refundAmountInr > order.total_inr) {
    return NextResponse.json(
      { error: "Refund amount cannot exceed order total" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("orders")
    .update({
      payment_status: "refunded",
      refund_notes: notes || null,
      refund_amount_inr: Math.round(refundAmountInr),
      refund_txn_id: refundTxnId,
      refunded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ADMIN_ORDER_LIST_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
