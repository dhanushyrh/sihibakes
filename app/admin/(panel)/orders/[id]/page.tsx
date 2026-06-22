"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/delivery";
import { orderItemTitle } from "@/lib/order-roster";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/orders/OrderBadges";
import { OrderStatusSelect } from "@/components/admin/orders/OrderStatusSelect";
import { OrderStatusPipeline } from "@/components/admin/orders/OrderStatusPipeline";
import { OrderStatusChangeModal } from "@/components/admin/orders/OrderStatusChangeModal";
import type { OrderStatusUpdatePayload } from "@/lib/order-status-update";
import { canCancelOrderStatus } from "@/lib/order-status-transitions";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  User,
} from "lucide-react";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundTxnId, setRefundTxnId] = useState("");
  const [statusModalTarget, setStatusModalTarget] = useState<OrderStatus | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/orders/${params.id}`);
    const data = await res.json();

    if (!res.ok || !data) {
      setError(data?.error ?? "Order not found");
      setOrder(null);
      setItems([]);
    } else {
      const orderData = data as Order & { order_items?: OrderItem[] };
      setOrder(orderData);
      setItems(orderData.order_items ?? []);
    }

    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const requestStatusChange = (status: OrderStatus) => {
    if (!order || order.status === status) return;
    setStatusModalTarget(status);
  };

  const closeStatusModal = () => {
    if (saving) return;
    setStatusModalTarget(null);
  };

  const confirmStatusChange = async (payload: OrderStatusUpdatePayload) => {
    if (!order) return;
    setSaving(true);
    setError(null);

    const body: Record<string, string> = { status: payload.status };
    if (payload.delivery) {
      Object.assign(body, payload.delivery);
    }

    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update status");
    } else {
      setOrder(data as Order);
      setStatusModalTarget(null);
    }
    setSaving(false);
  };

  const cancelOrder = async () => {
    if (!order || !notes.trim()) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/orders/${order.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to cancel order");
    } else {
      setOrder(data as Order);
      setShowCancel(false);
      setNotes("");
    }
    setSaving(false);
  };

  const markRefunded = async () => {
    if (!order || !refundAmount.trim() || !refundTxnId.trim()) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refund_amount_inr: Number(refundAmount),
        refund_txn_id: refundTxnId.trim(),
        notes: notes.trim(),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to mark refund");
    } else {
      setOrder(data as Order);
      setShowRefund(false);
      setNotes("");
      setRefundAmount("");
      setRefundTxnId("");
    }
    setSaving(false);
  };

  const openRefundForm = () => {
    if (!order) return;
    setNotes("");
    setRefundAmount(String(order.total_inr));
    setRefundTxnId("");
    setShowRefund(true);
    setShowCancel(false);
  };

  const resetActionForms = () => {
    setShowCancel(false);
    setShowRefund(false);
    setNotes("");
    setRefundAmount("");
    setRefundTxnId("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#4B2C20]/40" size={28} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center ring-1 ring-[#4B2C20]/10">
        <p className="font-medium text-[#4B2C20]">{error ?? "Order not found"}</p>
        <Link
          href="/admin/orders"
          className="mt-4 inline-flex items-center gap-1 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20]"
        >
          <ArrowLeft size={14} /> Back to orders
        </Link>
      </div>
    );
  }

  const canCancel = canCancelOrderStatus(order.status);
  const canConfirm =
    order.status === "pending" && order.payment_status === "paid";
  const canRefund =
    order.status === "cancelled" && order.payment_status === "paid";

  const address = [
    order.house,
    order.street,
    order.landmark,
    order.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20]"
      >
        <ArrowLeft size={14} /> All orders
      </Link>

      <header className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            #{order.order_number}
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            Placed {format(parseISO(order.created_at), "EEEE, d MMMM yyyy · h:mm a")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} size="md" />
            <PaymentStatusBadge status={order.payment_status} size="md" />
          </div>
        </div>
        <p className="text-2xl font-semibold text-[#4B2C20]">
          {formatCurrency(order.total_inr)}
        </p>
      </header>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {canConfirm && (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-4 ring-1 ring-amber-200">
          <p className="text-sm font-medium text-amber-950">
            Payment received — awaiting your confirmation
          </p>
          <p className="mt-1 text-sm text-amber-900/80">
            Review the order details, then confirm to start preparation and notify
            the customer.
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => requestStatusChange("confirmed")}
            className="mt-3 rounded-full bg-[#4B2C20] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirm order
          </button>
        </div>
      )}

      <div className="mt-4">
        <OrderStatusPipeline status={order.status} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
          <h2 className="text-sm font-semibold text-[#4B2C20]">Customer</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#4B2C20]/80">
            <li className="flex items-center gap-2">
              <User size={14} className="shrink-0 text-[#4B2C20]/40" />
              {order.customer_name}
            </li>
            <li className="flex items-center gap-2">
              <Phone size={14} className="shrink-0 text-[#4B2C20]/40" />
              <span className="text-[#4B2C20]/50">WhatsApp</span>
              <a href={`tel:${order.phone}`} className="hover:underline">
                {order.phone}
              </a>
            </li>
            {order.alt_phone ? (
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0 text-[#4B2C20]/40" />
                <span className="text-[#4B2C20]/50">Alt.</span>
                <a href={`tel:${order.alt_phone}`} className="hover:underline">
                  {order.alt_phone}
                </a>
              </li>
            ) : null}
            <li className="flex items-start gap-2">
              <MapPin size={14} className="mt-0.5 shrink-0 text-[#4B2C20]/40" />
              <span>{address}</span>
            </li>
          </ul>
          <a
            href={`https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-[#4B2C20]/60 hover:text-[#4B2C20]"
          >
            <ExternalLink size={12} /> Open in Maps
          </a>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
          <h2 className="text-sm font-semibold text-[#4B2C20]">Delivery</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#4B2C20]/50">Date</dt>
              <dd className="font-medium text-[#4B2C20]">
                {format(parseISO(order.delivery_date), "EEE, d MMM yyyy")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#4B2C20]/50">Window</dt>
              <dd className="font-medium text-[#4B2C20]">
                {order.delivery_window_start?.slice(0, 5)} –{" "}
                {order.delivery_window_end?.slice(0, 5)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#4B2C20]/50">Distance</dt>
              <dd className="font-medium text-[#4B2C20]">
                {order.distance_km.toFixed(1)} km
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {(order.delivery_vendor ||
        order.delivery_partner_order_id ||
        order.delivery_partner_name) && (
        <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
          <h2 className="text-sm font-semibold text-[#4B2C20]">Delivery dispatch</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {order.delivery_partner_order_id && (
              <div>
                <dt className="text-[#4B2C20]/50">Order ID</dt>
                <dd className="font-medium text-[#4B2C20]">
                  {order.delivery_partner_order_id}
                </dd>
              </div>
            )}
            {order.delivery_vendor && (
              <div>
                <dt className="text-[#4B2C20]/50">Vendor</dt>
                <dd className="font-medium text-[#4B2C20]">{order.delivery_vendor}</dd>
              </div>
            )}
            {order.delivery_partner_name && (
              <div>
                <dt className="text-[#4B2C20]/50">Partner</dt>
                <dd className="font-medium text-[#4B2C20]">
                  {order.delivery_partner_name}
                </dd>
              </div>
            )}
            {order.delivery_otp && (
              <div>
                <dt className="text-[#4B2C20]/50">OTP</dt>
                <dd className="font-medium tabular-nums text-[#4B2C20]">
                  {order.delivery_otp}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
        <h2 className="text-sm font-semibold text-[#4B2C20]">Items</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-[#4B2C20]/50">No line items</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#4B2C20]/10 text-left text-xs text-[#4B2C20]/50">
                  <th className="pb-2 pr-3 font-medium">Product</th>
                  <th className="pb-2 pr-3 font-medium">Qty</th>
                  <th className="pb-2 pr-3 font-medium">Unit price</th>
                  <th className="pb-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#4B2C20]/5 last:border-0"
                  >
                    <td className="py-2.5 pr-3 font-medium text-[#4B2C20]">
                      {orderItemTitle(item)}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-[#4B2C20]/80">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 pr-3 text-[#4B2C20]/70">
                      {formatCurrency(item.unit_price_inr)}
                    </td>
                    <td className="py-2.5 text-right font-medium text-[#4B2C20]">
                      {formatCurrency(item.line_total_inr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <dl className="mt-4 space-y-1.5 border-t border-[#4B2C20]/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#4B2C20]/50">Subtotal</dt>
            <dd>{formatCurrency(order.subtotal_inr)}</dd>
          </div>
          {order.discount_inr > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Discount</dt>
              <dd>−{formatCurrency(order.discount_inr)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-[#4B2C20]/50">Delivery fee</dt>
            <dd>{formatCurrency(order.delivery_fee_inr)}</dd>
          </div>
          <div className="flex justify-between border-t border-[#4B2C20]/10 pt-2 font-semibold text-[#4B2C20]">
            <dt>Total</dt>
            <dd>{formatCurrency(order.total_inr)}</dd>
          </div>
        </dl>
      </section>

      {(order.cancellation_notes || order.payment_status === "refunded") && (
        <section className="mt-4 rounded-2xl bg-[#F5E6D3]/40 p-5 ring-1 ring-[#4B2C20]/10">
          <h2 className="text-sm font-semibold text-[#4B2C20]">Admin notes</h2>
          {order.cancellation_notes && (
            <div className="mt-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50">
                Cancelled
                {order.cancelled_at &&
                  ` · ${format(parseISO(order.cancelled_at), "d MMM yyyy, h:mm a")}`}
              </p>
              <p className="mt-1 text-sm text-[#4B2C20]/80">
                {order.cancellation_notes}
              </p>
            </div>
          )}
          {order.payment_status === "refunded" && (
            <div
              className={`${order.cancellation_notes ? "mt-4 border-t border-[#4B2C20]/10 pt-4" : "mt-3"}`}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-violet-700">
                Refunded
                {order.refunded_at &&
                  ` · ${format(parseISO(order.refunded_at), "d MMM yyyy, h:mm a")}`}
              </p>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                {order.refund_amount_inr != null && (
                  <div>
                    <dt className="text-[#4B2C20]/50">Amount</dt>
                    <dd className="font-medium text-[#4B2C20]">
                      {formatCurrency(order.refund_amount_inr)}
                    </dd>
                  </div>
                )}
                {order.refund_txn_id && (
                  <div>
                    <dt className="text-[#4B2C20]/50">Transaction ID</dt>
                    <dd className="font-medium break-all text-[#4B2C20]">
                      {order.refund_txn_id}
                    </dd>
                  </div>
                )}
              </dl>
              {order.refund_notes && (
                <p className="mt-2 text-sm text-[#4B2C20]/80">{order.refund_notes}</p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
        <h2 className="text-sm font-semibold text-[#4B2C20]">Actions</h2>

        {order.status !== "cancelled" && (
          <div className="mt-3">
            <label className="text-xs text-[#4B2C20]/50">Update status</label>
            <div className="mt-1.5">
              <OrderStatusSelect
                fullWidth
                value={order.status}
                paymentStatus={order.payment_status}
                disabled={saving}
                onRequestChange={requestStatusChange}
              />
            </div>
          </div>
        )}

        {order.status === "cancelled" && (
          <div className="mt-3">
            <p className="text-xs text-[#4B2C20]/50">Status</p>
            <div className="mt-1.5">
              <OrderStatusBadge status={order.status} size="md" />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {canConfirm && (
            <button
              type="button"
              disabled={saving}
              onClick={() => requestStatusChange("confirmed")}
              className="rounded-full bg-[#4B2C20] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirm order
            </button>
          )}
          {canCancel && !showCancel && (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setNotes("");
                setShowCancel(true);
                setShowRefund(false);
              }}
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Cancel order
            </button>
          )}
          {canRefund && !showRefund && (
            <button
              type="button"
              disabled={saving}
              onClick={openRefundForm}
              className="rounded-full border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
            >
              Mark as refunded
            </button>
          )}
        </div>

        {showCancel && (
          <div className="mt-4 rounded-xl bg-[#F5E6D3]/30 p-4">
            <label className="text-xs font-medium text-[#4B2C20]">
              Cancellation notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation…"
              className="mt-2 w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2 text-sm"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={saving || !notes.trim()}
                onClick={cancelOrder}
                className="rounded-full bg-[#4B2C20] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Confirm cancel"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={resetActionForms}
                className="rounded-full px-4 py-2 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20]"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {showRefund && (
          <div className="mt-4 rounded-xl bg-violet-50/80 p-4 ring-1 ring-violet-100">
            <p className="text-xs font-medium text-violet-900">Refund details</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-1">
                <span className="text-xs text-[#4B2C20]/60">Refund amount (₹)</span>
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
              <label className="block sm:col-span-1">
                <span className="text-xs text-[#4B2C20]/60">Transaction ID</span>
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
            <label className="mt-3 block">
              <span className="text-xs text-[#4B2C20]/60">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional refund notes…"
                className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={
                  saving ||
                  !refundAmount.trim() ||
                  !refundTxnId.trim() ||
                  Number(refundAmount) <= 0
                }
                onClick={markRefunded}
                className="rounded-full bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Confirm refund"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={resetActionForms}
                className="rounded-full px-4 py-2 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20]"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </section>

      <OrderStatusChangeModal
        order={order}
        targetStatus={statusModalTarget}
        saving={saving}
        onClose={closeStatusModal}
        onConfirm={confirmStatusChange}
      />

      <button
        type="button"
        onClick={() => router.refresh()}
        className="mt-6 text-xs text-[#4B2C20]/40 hover:text-[#4B2C20]/60"
      >
        Refresh
      </button>
    </div>
  );
}
