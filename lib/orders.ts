import { createAdminClient } from "@/lib/supabase/admin";

const BLOCKING_ORDERS_FILTER =
  "payment_status.eq.pending,and(payment_status.eq.paid,status.in.(pending,confirmed,preparing,out_for_delivery))";

export async function countBlockingOrdersForDeliveryDate(
  deliveryDate: string
): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("delivery_date", deliveryDate)
    .or(BLOCKING_ORDERS_FILTER);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export function formatBlockingOrdersError(count: number): string {
  return `Cannot close this day — ${count} pending or ongoing order${count === 1 ? "" : "s"} scheduled for delivery.`;
}
