"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";
import { formatCurrency } from "@/lib/delivery";
import type { OrderCancelPayload } from "@/lib/admin-order-cancel";
import { X } from "lucide-react";

type OrderCancelModalProps = {
  order: Order | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (payload: OrderCancelPayload) => void;
};

export function OrderCancelModal({
  order,
  saving,
  onClose,
  onConfirm,
}: OrderCancelModalProps) {
  const [cancellationNotes, setCancellationNotes] = useState("");
  const [markRefunded, setMarkRefunded] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundTxnId, setRefundTxnId] = useState("");
  const [refundNotes, setRefundNotes] = useState("");

  const open = Boolean(order);
  const canRefund = order?.payment_status === "paid";

  useEffect(() => {
    if (!open || !order) return;
    setCancellationNotes("");
    setMarkRefunded(false);
    setRefundAmount(String(order.total_inr));
    setRefundTxnId("");
    setRefundNotes("");
  }, [open, order]);

  if (!open || !order) return null;

  const refundAmountNum = Number(refundAmount);
  const refundValid =
    !markRefunded ||
    (refundAmount.trim() &&
      refundTxnId.trim() &&
      Number.isFinite(refundAmountNum) &&
      refundAmountNum > 0 &&
      refundAmountNum <= order.total_inr);

  const canSubmit = cancellationNotes.trim() && refundValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm({
      cancellationNotes: cancellationNotes.trim(),
      markRefunded: canRefund && markRefunded,
      refundAmountInr: markRefunded ? refundAmountNum : undefined,
      refundTxnId: markRefunded ? refundTxnId.trim() : undefined,
      refundNotes: markRefunded ? refundNotes.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={saving ? undefined : onClose}
        aria-label="Close"
      />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl ring-1 ring-[#4B2C20]/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#4B2C20]/50">
              Cancel order
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#4B2C20]">
              #{order.order_number}
            </h2>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5E6D3] text-[#4B2C20] disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-[#4B2C20]">
              Cancellation notes
            </span>
            <textarea
              required
              value={cancellationNotes}
              onChange={(e) => setCancellationNotes(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation…"
              className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm"
            />
          </label>

          {canRefund && (
            <div className="rounded-xl bg-violet-50/80 p-4 ring-1 ring-violet-100">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={markRefunded}
                  onChange={(e) => setMarkRefunded(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#4B2C20]/20"
                />
                <span>
                  <span className="text-sm font-medium text-violet-900">
                    Mark as refunded
                  </span>
                  <span className="mt-0.5 block text-xs text-violet-800/80">
                    Record refund details for this paid order
                  </span>
                </span>
              </label>

              {markRefunded && (
                <div className="mt-4 space-y-3 border-t border-violet-100 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs text-[#4B2C20]/60">
                        Refund amount (₹)
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={order.total_inr}
                        required
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2 text-sm"
                      />
                      <span className="mt-0.5 block text-[10px] text-[#4B2C20]/40">
                        Order total {formatCurrency(order.total_inr)}
                      </span>
                    </label>
                    <label className="block">
                      <span className="text-xs text-[#4B2C20]/60">
                        Transaction ID
                      </span>
                      <input
                        type="text"
                        required
                        value={refundTxnId}
                        onChange={(e) => setRefundTxnId(e.target.value)}
                        placeholder="Bank / Razorpay refund ID"
                        className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs text-[#4B2C20]/60">
                      Refund notes (optional)
                    </span>
                    <textarea
                      value={refundNotes}
                      onChange={(e) => setRefundNotes(e.target.value)}
                      rows={2}
                      placeholder="Additional refund notes…"
                      className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="flex-1 rounded-full bg-red-700 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm cancel"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-full px-4 py-2.5 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20] disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
