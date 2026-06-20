import { NextResponse } from "next/server";
import crypto from "crypto";
import { markOrderPaid } from "@/lib/order-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
