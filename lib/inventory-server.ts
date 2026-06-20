import { createAdminClient } from "@/lib/supabase/admin";

export async function incrementProductCountsForOrder(orderId: string) {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("delivery_date, order_items(product_id, quantity)")
    .eq("id", orderId)
    .single();

  if (!order) return;

  const deliveryDate = order.delivery_date as string;
  const orderItems = order.order_items as { product_id: string; quantity: number }[];

  for (const item of orderItems) {
    const { data: existing } = await admin
      .from("product_daily_counts")
      .select("*")
      .eq("product_id", item.product_id)
      .eq("count_date", deliveryDate)
      .single();

    if (existing) {
      await admin
        .from("product_daily_counts")
        .update({ order_count: existing.order_count + item.quantity })
        .eq("id", existing.id);
    } else {
      await admin.from("product_daily_counts").insert({
        product_id: item.product_id,
        count_date: deliveryDate,
        order_count: item.quantity,
      });
    }
  }
}
