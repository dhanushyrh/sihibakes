export type OrderCancelPayload = {
  cancellationNotes: string;
  markRefunded: boolean;
  refundAmountInr?: number;
  refundTxnId?: string;
  refundNotes?: string;
};

export async function submitOrderCancel(
  orderId: string,
  payload: OrderCancelPayload,
  paymentStatus: string
): Promise<{ order: unknown } | { error: string }> {
  const cancelRes = await fetch(`/api/admin/orders/${orderId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes: payload.cancellationNotes }),
  });
  const cancelData = await cancelRes.json();
  if (!cancelRes.ok) {
    return { error: cancelData.error ?? "Failed to cancel order" };
  }

  if (!payload.markRefunded || paymentStatus !== "paid") {
    return { order: cancelData };
  }

  const amount = payload.refundAmountInr;
  const txnId = payload.refundTxnId?.trim();
  if (!amount || amount <= 0 || !txnId) {
    return { error: "Refund amount and transaction ID are required" };
  }

  const refundRes = await fetch(`/api/admin/orders/${orderId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refund_amount_inr: amount,
      refund_txn_id: txnId,
      notes: payload.refundNotes?.trim() ?? "",
    }),
  });
  const refundData = await refundRes.json();
  if (!refundRes.ok) {
    return { error: refundData.error ?? "Order cancelled but refund failed" };
  }

  return { order: refundData };
}
