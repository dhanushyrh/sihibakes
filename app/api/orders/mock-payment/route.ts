import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markOrderPaid } from "@/lib/order-payment";
import { notifyOrderPlaced } from "@/lib/whatsapp/notifications";
import { isRazorpayTestMode } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isRazorpayTestMode()) {
      return NextResponse.json({ error: "Not available" }, { status: 403 });
    }

    const { order_id, order_number, phone } = await request.json();
    if (!order_id || !order_number || !phone) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("orders")
      .select("id, order_number, phone, payment_status")
      .eq("id", order_id)
      .eq("order_number", order_number)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const normalized = String(phone).replace(/\D/g, "").slice(-10);
    const orderPhone = String(order.phone).replace(/\D/g, "").slice(-10);
    if (normalized !== orderPhone) {
      return NextResponse.json({ error: "Phone mismatch" }, { status: 403 });
    }

    if (order.payment_status === "paid") {
      const whatsapp = await notifyOrderPlaced(order_id);
      return NextResponse.json({
        ok: true,
        already_paid: true,
        whatsapp_sent: whatsapp.ok,
        whatsapp_error: whatsapp.error,
      });
    }

    const { newlyPaid, whatsapp } = await markOrderPaid(
      order_id,
      `mock_${Date.now()}`
    );
    if (!newlyPaid) {
      return NextResponse.json({ error: "Payment update failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      newly_paid: true,
      whatsapp_sent: whatsapp?.ok ?? false,
      whatsapp_error: whatsapp?.error ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
