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
      console.error("Razorpay signature mismatch for order", order_id);
      return NextResponse.json(
        {
          error: "Payment signature mismatch",
          code: "INVALID_SIGNATURE",
        },
        { status: 400 }
      );
    }

    const { newlyPaid, whatsapp } = await markOrderPaid(
      order_id,
      razorpay_payment_id
    );

    return NextResponse.json({
      success: true,
      newly_paid: newlyPaid,
      whatsapp_sent: whatsapp?.ok ?? false,
    });
  } catch (err) {
    console.error("Payment verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
