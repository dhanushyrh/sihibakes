import { createAdminClient } from "@/lib/supabase/admin";
import { incrementProductCountsForOrder } from "@/lib/inventory-server";
import type { OrderStatus } from "@/lib/types";

/** Marks order paid if not already. Returns true when payment was newly applied. */
export async function markOrderPaid(
  orderId: string,
  paymentId: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("payment_status, status")
    .eq("id", orderId)
    .single();

  if (!order || order.payment_status === "paid") return false;

  await admin
    .from("orders")
    .update({
      payment_status: "paid",
      status: "pending",
      razorpay_payment_id: paymentId,
    })
    .eq("id", orderId);

  return true;
}

/** Reserve daily inventory when admin accepts a paid order for fulfillment. */
export async function fulfillPaidOrder(orderId: string): Promise<void> {
  await incrementProductCountsForOrder(orderId);
}

export function shouldFulfillOnStatusChange(
  previousStatus: OrderStatus,
  nextStatus: OrderStatus,
  paymentStatus: string
): boolean {
  return (
    previousStatus === "pending" &&
    nextStatus !== "pending" &&
    nextStatus !== "cancelled" &&
    paymentStatus === "paid"
  );
}
