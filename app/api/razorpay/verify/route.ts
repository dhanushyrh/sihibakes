import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { incrementProductCountsForOrder } from "@/lib/inventory-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function markOrderPaid(orderId: string, paymentId: string) {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("payment_status")
    .eq("id", orderId)
    .single();

  if (!order || order.payment_status === "paid") return;

  await admin
    .from("orders")
    .update({
      payment_status: "paid",
      status: "confirmed",
      razorpay_payment_id: paymentId,
    })
    .eq("id", orderId);

  await incrementProductCountsForOrder(orderId);
}

export async function POST(request: Request) {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    await markOrderPaid(order_id, razorpay_payment_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Payment verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
