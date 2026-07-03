import { createAdminClient } from "@/lib/supabase/admin";
import {
  commitOrderInventory,
  incrementProductCountsForOrder,
} from "@/lib/inventory-server";
import { notifyAdminNewOrder, notifyOrderPlaced } from "@/lib/whatsapp/notifications";
import { markActivityOrderCompleted } from "@/lib/customer-activity";
import type { OrderStatus } from "@/lib/types";

export type MarkOrderPaidResult = {
  newlyPaid: boolean;
  whatsapp: Awaited<ReturnType<typeof notifyOrderPlaced>> | null;
};

/** Marks order paid if not already. Always attempts the order-placed WhatsApp once. */
export async function markOrderPaid(
  orderId: string,
  paymentId: string
): Promise<MarkOrderPaidResult> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("payment_status, status, inventory_hold_status")
    .eq("id", orderId)
    .single();

  if (!order) {
    return { newlyPaid: false, whatsapp: null };
  }

  const newlyPaid = order.payment_status !== "paid";

  if (newlyPaid) {
    const commitResult = await commitOrderInventory(orderId);
    if (!commitResult.ok && !commitResult.skipped) {
      console.error(
        `commit_order_inventory failed for order ${orderId}:`,
        commitResult.error
      );
    }

    await admin
      .from("orders")
      .update({
        payment_status: "paid",
        status: "pending",
        razorpay_payment_id: paymentId,
      })
      .eq("id", orderId);

    void markActivityOrderCompleted(orderId);
  }

  let whatsapp: MarkOrderPaidResult["whatsapp"] = null;
  try {
    whatsapp = await notifyOrderPlaced(orderId);
    if (!whatsapp.ok) {
      console.error(
        `WhatsApp order placed notification failed for order ${orderId}:`,
        whatsapp.error ?? "unknown error"
      );
    } else if (whatsapp.messageId) {
      console.info(
        `WhatsApp order placed notification sent for order ${orderId} (${whatsapp.messageId})`
      );
    }
  } catch (err) {
    console.error("WhatsApp order placed notification failed after payment:", err);
  }

  void notifyAdminNewOrder(orderId).catch((err) => {
    console.error("WhatsApp admin new-order alert failed after payment:", err);
  });

  return { newlyPaid, whatsapp };
}

/** Reserve daily inventory when admin accepts a paid order for fulfillment. */
export async function fulfillPaidOrder(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("inventory_hold_status")
    .eq("id", orderId)
    .single();

  if (order?.inventory_hold_status === "committed") {
    return;
  }

  await incrementProductCountsForOrder(orderId);
}

export function shouldFulfillOnStatusChange(
  previousStatus: OrderStatus,
  nextStatus: OrderStatus,
  paymentStatus: string
): boolean {
  return (
    previousStatus === "pending" &&
    nextStatus === "confirmed" &&
    paymentStatus === "paid"
  );
}
