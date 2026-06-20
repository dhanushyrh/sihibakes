import { createAdminClient } from "@/lib/supabase/admin";
import { incrementProductCountsForOrder } from "@/lib/inventory-server";
import { notifyOrderConfirmed } from "@/lib/whatsapp/notifications";

/** Marks order paid if not already. Returns true when payment was newly applied. */
export async function markOrderPaid(
  orderId: string,
  paymentId: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("payment_status")
    .eq("id", orderId)
    .single();

  if (!order || order.payment_status === "paid") return false;

  await admin
    .from("orders")
    .update({
      payment_status: "paid",
      status: "confirmed",
      razorpay_payment_id: paymentId,
    })
    .eq("id", orderId);

  await incrementProductCountsForOrder(orderId);

  void notifyOrderConfirmed(orderId);

  return true;
}
