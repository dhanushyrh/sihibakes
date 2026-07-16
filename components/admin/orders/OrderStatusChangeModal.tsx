"use client";

import { useEffect, useMemo, useState } from "react";
import type { DeliveryVendor, Order, OrderStatus } from "@/lib/types";
import {
  requiresDeliveryDispatch,
  BORZO_VENDOR_NAME,
  statusChangeLabel,
  type DeliveryDispatchDetails,
  type DeliveryDispatchMode,
  type DeliveryEtaInput,
  type OrderStatusUpdatePayload,
} from "@/lib/order-status-update";
import { formatDispatchEtaFromWindow } from "@/lib/whatsapp/dispatch-eta";
import { ORDER_STATUS_COLORS } from "@/lib/order-badges";
import { X } from "lucide-react";

interface OrderStatusChangeModalProps {
  order: Order | null;
  targetStatus: OrderStatus | null;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (payload: OrderStatusUpdatePayload) => void;
}

const emptyDelivery = (): DeliveryDispatchDetails => ({
  delivery_partner_order_id: "",
  delivery_vendor: "",
  delivery_otp: "",
  delivery_partner_name: "",
});

const emptyEta = (): DeliveryEtaInput => ({
  date: "",
  window_start: "",
  window_end: "",
});

export function OrderStatusChangeModal({
  order,
  targetStatus,
  saving,
  error = null,
  onClose,
  onConfirm,
}: OrderStatusChangeModalProps) {
  const [delivery, setDelivery] = useState<DeliveryDispatchDetails>(emptyDelivery);
  const [deliveryEta, setDeliveryEta] = useState<DeliveryEtaInput>(emptyEta);
  const [dispatchMode, setDispatchMode] = useState<DeliveryDispatchMode>("partner");
  const [vendors, setVendors] = useState<DeliveryVendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  const open = Boolean(order && targetStatus);
  const needsDispatch = targetStatus
    ? requiresDeliveryDispatch(targetStatus)
    : false;
  const needsPartnerDispatch = needsDispatch && dispatchMode === "partner";

  useEffect(() => {
    if (!open || !order) return;
    setDispatchMode("partner");
    setDelivery({
      delivery_partner_order_id: order.delivery_partner_order_id ?? order.order_number,
      delivery_vendor: order.delivery_vendor ?? "",
      delivery_otp: order.delivery_otp ?? "",
      delivery_partner_name: order.delivery_partner_name ?? "",
    });
    setDeliveryEta({
      date: order.delivery_date,
      window_start: order.delivery_window_start.slice(0, 5),
      window_end: order.delivery_window_end.slice(0, 5),
    });
  }, [open, order]);

  useEffect(() => {
    if (!open || !needsPartnerDispatch) return;

    let cancelled = false;
    setVendorsLoading(true);

    fetch("/api/admin/delivery-vendors")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load vendors");
        return data.vendors as DeliveryVendor[];
      })
      .then((loaded) => {
        if (cancelled) return;
        setVendors(loaded);
        setDelivery((current) => {
          const borzo = loaded.find(
            (vendor) => vendor.name.toLowerCase() === BORZO_VENDOR_NAME.toLowerCase()
          );
          if (current.delivery_vendor) return current;
          return {
            ...current,
            delivery_vendor: borzo?.name ?? loaded[0]?.name ?? "",
          };
        });
      })
      .catch(() => {
        if (!cancelled) setVendors([]);
      })
      .finally(() => {
        if (!cancelled) setVendorsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, needsPartnerDispatch]);

  const etaPreview = useMemo(() => {
    if (!deliveryEta.date || !deliveryEta.window_start || !deliveryEta.window_end) {
      return "";
    }
    return formatDispatchEtaFromWindow(
      deliveryEta.date,
      deliveryEta.window_start,
      deliveryEta.window_end
    );
  }, [deliveryEta]);

  if (!open || !order || !targetStatus) return null;

  const etaReady =
    deliveryEta.date.trim() &&
    deliveryEta.window_start.trim() &&
    deliveryEta.window_end.trim();

  const partnerDispatchValid =
    delivery.delivery_vendor.trim() &&
    delivery.delivery_partner_order_id.trim() &&
    delivery.delivery_otp.trim() &&
    delivery.delivery_partner_name.trim();

  const dispatchReady = needsDispatch
    ? etaReady &&
      (dispatchMode === "self" ||
        (partnerDispatchValid && vendors.length > 0 && !vendorsLoading))
    : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchReady) return;
    onConfirm({
      status: targetStatus,
      dispatchMode: needsDispatch ? dispatchMode : undefined,
      deliveryEta: needsDispatch ? deliveryEta : undefined,
      delivery: needsDispatch && dispatchMode === "partner"
        ? {
            delivery_partner_order_id: delivery.delivery_partner_order_id.trim(),
            delivery_vendor: delivery.delivery_vendor.trim(),
            delivery_otp: delivery.delivery_otp.trim(),
            delivery_partner_name: delivery.delivery_partner_name.trim(),
          }
        : undefined,
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
              Update order status
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

        <p className="mt-4 text-sm text-[#4B2C20]/70">
          Change status from{" "}
          <span className="font-medium capitalize text-[#4B2C20]">
            {statusChangeLabel(order.status).toLowerCase()}
          </span>{" "}
          to{" "}
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              ORDER_STATUS_COLORS[targetStatus]
            }`}
          >
            {statusChangeLabel(targetStatus).toLowerCase()}
          </span>
          ?
        </p>

        {targetStatus === "confirmed" && (
          <p className="mt-2 text-xs text-[#4B2C20]/55">
            Inventory will be reserved and the customer will be notified.
          </p>
        )}
        {targetStatus === "delivered" && order.status === "out_for_delivery" && (
          <p className="mt-2 text-xs text-[#4B2C20]/55">
            Mark when the order has been handed off to the customer.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {needsDispatch && (
            <>
              <fieldset>
                <legend className="text-xs font-medium text-[#4B2C20]">
                  Dispatch type
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label
                    className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm ${
                      dispatchMode === "partner"
                        ? "border-[#4B2C20] bg-[#F5E6D3]/60 font-medium text-[#4B2C20]"
                        : "border-[#4B2C20]/10 text-[#4B2C20]/70"
                    }`}
                  >
                    <input
                      type="radio"
                      name="dispatchMode"
                      value="partner"
                      checked={dispatchMode === "partner"}
                      onChange={() => setDispatchMode("partner")}
                      className="sr-only"
                    />
                    Delivery partner
                  </label>
                  <label
                    className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm ${
                      dispatchMode === "self"
                        ? "border-teal-700 bg-teal-50 font-medium text-teal-900"
                        : "border-[#4B2C20]/10 text-[#4B2C20]/70"
                    }`}
                  >
                    <input
                      type="radio"
                      name="dispatchMode"
                      value="self"
                      checked={dispatchMode === "self"}
                      onChange={() => setDispatchMode("self")}
                      className="sr-only"
                    />
                    Self delivery
                  </label>
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-[#4B2C20]/10 p-3">
                <legend className="px-1 text-xs font-medium text-[#4B2C20]">
                  Customer ETA (WhatsApp)
                </legend>
                <p className="mb-3 text-xs text-[#4B2C20]/55">
                  Prefilled from the booked delivery slot. Adjust if the handoff
                  time changes.
                </p>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium text-[#4B2C20]">Date</span>
                    <input
                      type="date"
                      required
                      value={deliveryEta.date}
                      onChange={(e) =>
                        setDeliveryEta((current) => ({
                          ...current,
                          date: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-medium text-[#4B2C20]">
                        From
                      </span>
                      <input
                        type="time"
                        required
                        value={deliveryEta.window_start}
                        onChange={(e) =>
                          setDeliveryEta((current) => ({
                            ...current,
                            window_start: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-[#4B2C20]">
                        Until
                      </span>
                      <input
                        type="time"
                        required
                        value={deliveryEta.window_end}
                        onChange={(e) =>
                          setDeliveryEta((current) => ({
                            ...current,
                            window_end: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  {etaPreview ? (
                    <p className="text-xs text-[#4B2C20]/60">
                      WhatsApp ETA:{" "}
                      <span className="font-medium text-[#4B2C20]">{etaPreview}</span>
                    </p>
                  ) : null}
                </div>
              </fieldset>

              {dispatchMode === "self" ? (
                <p className="text-xs text-teal-800">
                  Your team will deliver this order. The customer will be notified
                  with the ETA above.
                </p>
              ) : (
                <>
                  <p className="text-xs text-[#4B2C20]/50">
                    Enter delivery partner details before dispatching.
                  </p>
                  <label className="block">
                    <span className="text-xs font-medium text-[#4B2C20]">Vendor</span>
                    <select
                      required
                      value={delivery.delivery_vendor}
                      disabled={vendorsLoading || vendors.length === 0}
                      onChange={(e) =>
                        setDelivery((d) => ({ ...d, delivery_vendor: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2 text-sm disabled:opacity-60"
                    >
                      <option value="" disabled>
                        {vendorsLoading ? "Loading vendors…" : "Select vendor"}
                      </option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.name}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[#4B2C20]">Order ID</span>
                    <input
                      required
                      value={delivery.delivery_partner_order_id}
                      onChange={(e) =>
                        setDelivery((d) => ({
                          ...d,
                          delivery_partner_order_id: e.target.value,
                        }))
                      }
                      placeholder="Partner / vendor order ID"
                      className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[#4B2C20]">OTP</span>
                    <input
                      required
                      value={delivery.delivery_otp}
                      onChange={(e) =>
                        setDelivery((d) => ({ ...d, delivery_otp: e.target.value }))
                      }
                      placeholder="Delivery OTP for handoff"
                      className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[#4B2C20]">
                      Delivery partner name
                    </span>
                    <input
                      required
                      value={delivery.delivery_partner_name}
                      onChange={(e) =>
                        setDelivery((d) => ({
                          ...d,
                          delivery_partner_name: e.target.value,
                        }))
                      }
                      placeholder="Rider / partner name"
                      className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm"
                    />
                  </label>
                </>
              )}
            </>
          )}

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !dispatchReady}
              className="flex-1 rounded-full bg-[#4B2C20] py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-full px-4 py-2.5 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
