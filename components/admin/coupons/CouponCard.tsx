"use client";

import type { Coupon } from "@/lib/types";
import { COUPON_TYPE_OPTIONS } from "@/lib/constants";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { Pencil, Ticket, Trash2 } from "lucide-react";
import { Spinner } from "@/components/admin/ui/Spinner";

function typeLabel(type: Coupon["type"]) {
  return COUPON_TYPE_OPTIONS.find((t) => t.key === type)?.label ?? type;
}

function formatValue(coupon: Coupon) {
  if (coupon.type === "free_delivery") return "Free delivery";
  if (coupon.type === "percent_subtotal") return `${coupon.value_inr}% off`;
  return `₹${coupon.value_inr} off`;
}

function validityStatus(coupon: Coupon) {
  const now = new Date();
  if (coupon.valid_from && isBefore(now, parseISO(coupon.valid_from))) {
    return { label: "Scheduled", tone: "bg-amber-100 text-amber-800" };
  }
  if (coupon.valid_until && isAfter(now, parseISO(coupon.valid_until))) {
    return { label: "Expired", tone: "bg-red-100 text-red-700" };
  }
  return null;
}

type CouponCardProps = {
  coupon: Coupon;
  deleting?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function CouponCard({ coupon, deleting = false, onEdit, onDelete }: CouponCardProps) {
  const validity = validityStatus(coupon);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10 ${
        !coupon.is_active ? "opacity-90" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 bg-[#F5E6D3]/60 px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4B2C20]/10 text-[#4B2C20]">
            <Ticket size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-lg font-semibold tracking-wide text-[#4B2C20]">
              {coupon.code}
            </p>
            <p className="mt-0.5 text-sm font-medium text-[#4B2C20]/70">
              {formatValue(coupon)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {!coupon.is_active && (
            <span className="rounded-full bg-[#4B2C20]/10 px-2 py-0.5 text-[10px] font-medium text-[#4B2C20]/60">
              Inactive
            </span>
          )}
          {validity && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${validity.tone}`}
            >
              {validity.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[#4B2C20]/50">Type</dt>
            <dd className="text-right font-medium text-[#4B2C20]">
              {typeLabel(coupon.type)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#4B2C20]/50">Min subtotal</dt>
            <dd className="font-medium text-[#4B2C20]">
              {coupon.min_subtotal_inr > 0
                ? `₹${coupon.min_subtotal_inr}`
                : "None"}
            </dd>
          </div>
          {coupon.valid_from && (
            <div className="flex justify-between gap-3">
              <dt className="text-[#4B2C20]/50">Valid from</dt>
              <dd className="font-medium text-[#4B2C20]">
                {format(parseISO(coupon.valid_from), "d MMM yyyy")}
              </dd>
            </div>
          )}
          {coupon.valid_until && (
            <div className="flex justify-between gap-3">
              <dt className="text-[#4B2C20]/50">Valid until</dt>
              <dd className="font-medium text-[#4B2C20]">
                {format(parseISO(coupon.valid_until), "d MMM yyyy")}
              </dd>
            </div>
          )}
        </dl>

        {coupon.first_order_only && (
          <span className="mt-3 inline-flex w-fit rounded-full bg-[#F5E6D3] px-2.5 py-1 text-[10px] font-medium text-[#4B2C20]">
            First order only
          </span>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#F5E6D3] py-2 text-xs font-medium text-[#4B2C20]"
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center justify-center rounded-full px-3 py-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>
    </article>
  );
}
