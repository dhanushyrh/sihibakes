"use client";

import { useEffect, useState } from "react";
import type { DeliveryVendor, Order, OrderStatus } from "@/lib/types";
import {
  requiresDeliveryDispatch,
  requiresPartnerDispatchDetails,
  statusChangeLabel,
  type DeliveryDispatchDetails,
  type DeliveryDispatchMode,
  type OrderStatusUpdatePayload,
} from "@/lib/order-status-update";
import { ORDER_STATUS_COLORS } from "@/lib/order-badges";
import { X } from "lucide-react";

interface OrderStatusChangeModalProps {
  order: Order | null;
  targetStatus: OrderStatus | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (payload: OrderStatusUpdatePayload) => void;
}

const emptyDelivery = (): DeliveryDispatchDetails => ({
  delivery_partner_order_id: "",
  delivery_vendor: "",
  delivery_otp: "",
  delivery_partner_name: "",
});

export function OrderStatusChangeModal({
  order,
  targetStatus,
  saving,
  onClose,
  onConfirm,
}: OrderStatusChangeModalProps) {
  const [delivery, setDelivery] = useState<DeliveryDispatchDetails>(emptyDelivery);
  const [dispatchMode, setDispatchMode] = useState<DeliveryDispatchMode>("partner");
  const [vendors, setVendors] = useState<DeliveryVendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  const open = Boolean(order && targetStatus);
  const needsDispatch = targetStatus
    ? requiresDeliveryDispatch(targetStatus)
    : false;
  const needsPartnerDetails = targetStatus
    ? requiresPartnerDispatchDetails(targetStatus, dispatchMode)
    : false;

  useEffect(() => {
    if (!open || !order) return;
    setDispatchMode("partner");
    setDelivery({
      delivery_partner_order_id: order.delivery_partner_order_id ?? order.order_number,
      delivery_vendor: order.delivery_vendor ?? "",
      delivery_otp: order.delivery_otp ?? "",
      delivery_partner_name: order.delivery_partner_name ?? "",
    });
  }, [open, order]);

  useEffect(() => {
    if (!open || !needsPartnerDetails) return;

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
          if (current.delivery_vendor) return current;
          return { ...current, delivery_vendor: loaded[0]?.name ?? "" };
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
  }, [open, needsPartnerDetails]);

  if (!open || !order || !targetStatus) return null;

  const partnerDispatchValid =
    delivery.delivery_partner_order_id.trim() &&
    delivery.delivery_vendor.trim() &&
    delivery.delivery_otp.trim() &&
    delivery.delivery_partner_name.trim();

  const dispatchReady = needsDispatch
    ? dispatchMode === "self" ||
      (partnerDispatchValid && vendors.length > 0 && !vendorsLoading)
    : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchReady) return;
    onConfirm({
      status: targetStatus,
      dispatchMode: needsDispatch ? dispatchMode : undefined,
      delivery: needsPartnerDetails
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
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ring-[#4B2C20]/10">
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
        {targetStatus === "self_delivered" && (
          <p className="mt-2 text-xs text-teal-800">
            Mark when your team delivered the order directly — no delivery partner.
          </p>
        )}
        {targetStatus === "delivered" && order.status === "out_for_delivery" && (
          <p className="mt-2 text-xs text-[#4B2C20]/55">
            Mark when the delivery partner has completed the handoff.
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

              {dispatchMode === "self" ? (
                <p className="text-xs text-teal-800">
                  Your team will deliver this order — no vendor, OTP, or partner
                  name needed.
                </p>
              ) : (
                <>
                  <p className="text-xs text-[#4B2C20]/50">
                    Enter delivery partner details before dispatching.
                  </p>
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
                    <span className="text-xs font-medium text-[#4B2C20]">OTP</span>
                    <input
                      required
                      value={delivery.delivery_otp}
                      onChange={(e) =>
                        setDelivery((d) => ({ ...d, delivery_otp: e.target.value }))
                      }
                      placeholder="Delivery OTP"
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
