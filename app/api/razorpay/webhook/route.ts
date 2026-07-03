import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { markOrderPaid } from "@/lib/order-payment";
import { releaseOrderInventory } from "@/lib/inventory-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const admin = createAdminClient();

    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      const { data: order } = await admin
        .from("orders")
        .select("id, payment_status, inventory_hold_status")
        .eq("razorpay_order_id", razorpayOrderId)
        .single();

      if (
        order &&
        order.payment_status === "pending" &&
        order.inventory_hold_status === "held"
      ) {
        await releaseOrderInventory(order.id);
      }

      return NextResponse.json({ received: true });
    }

    if (event.event !== "payment.captured") {
      return NextResponse.json({ received: true });
    }

    const payment = event.payload.payment.entity;
    const razorpayOrderId = payment.order_id;
    const paymentId = payment.id;

    const { data: order } = await admin
      .from("orders")
      .select("id, payment_status")
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (!order || order.payment_status === "paid") {
      return NextResponse.json({ received: true });
    }

    await markOrderPaid(order.id, paymentId);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
