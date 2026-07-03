import { createAdminClient } from "@/lib/supabase/admin";
import { INVENTORY_HOLD_MINUTES, formatStockAvailabilityError } from "@/lib/inventory";

export type InventoryRpcResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  code?: string;
  product_id?: string;
  remaining?: number;
};

function parseInventoryRpcResult(data: unknown): InventoryRpcResult {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Invalid inventory response" };
  }
  const row = data as Record<string, unknown>;
  return {
    ok: Boolean(row.ok),
    skipped: row.skipped === true,
    error: typeof row.error === "string" ? row.error : undefined,
    code: typeof row.code === "string" ? row.code : undefined,
    product_id: typeof row.product_id === "string" ? row.product_id : undefined,
    remaining: typeof row.remaining === "number" ? row.remaining : undefined,
  };
}

export async function reserveOrderInventory(
  orderId: string
): Promise<InventoryRpcResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_order_inventory", {
    p_order_id: orderId,
    p_hold_minutes: INVENTORY_HOLD_MINUTES,
  });

  if (error) {
    console.error("reserve_order_inventory RPC error:", error);
    return { ok: false, error: "Could not reserve stock" };
  }

  return parseInventoryRpcResult(data);
}

export async function commitOrderInventory(
  orderId: string
): Promise<InventoryRpcResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("commit_order_inventory", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("commit_order_inventory RPC error:", error);
    return { ok: false, error: "Could not commit stock" };
  }

  return parseInventoryRpcResult(data);
}

export async function releaseOrderInventory(
  orderId: string
): Promise<InventoryRpcResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("release_order_inventory", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("release_order_inventory RPC error:", error);
    return { ok: false, error: "Could not release stock" };
  }

  return parseInventoryRpcResult(data);
}

export async function releaseExpiredInventoryHolds(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("release_expired_inventory_holds");

  if (error) {
    console.error("release_expired_inventory_holds RPC error:", error);
    return 0;
  }

  return typeof data === "number" ? data : 0;
}

/** Legacy path for orders fulfilled before payment-time inventory commits. */
export async function incrementProductCountsForOrder(orderId: string) {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("delivery_date, inventory_hold_status, order_items(product_id, quantity)")
    .eq("id", orderId)
    .single();

  if (!order) return;

  if (order.inventory_hold_status === "committed") {
    return;
  }

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

export async function cancelPendingOrder(orderId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("order_items").delete().eq("order_id", orderId);
  await admin.from("orders").delete().eq("id", orderId);
}

export function formatInventoryStockError(
  productTitle: string,
  rpc: InventoryRpcResult
): string {
  if (typeof rpc.remaining === "number") {
    return formatStockAvailabilityError(productTitle, rpc.remaining);
  }
  return formatStockAvailabilityError(productTitle, 0);
}
