/** Fire-and-forget release of a same-day inventory hold after payment abandon/failure. */
export async function releaseOrderInventoryHold(
  orderId: string,
  phone: string
): Promise<void> {
  try {
    await fetch("/api/orders/release-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, phone }),
    });
  } catch {
    // Webhook / cron will clean up if this fails.
  }
}
