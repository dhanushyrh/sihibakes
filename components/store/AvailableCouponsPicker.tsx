"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { describeCoupon } from "@/lib/coupon-display";
import type { CouponType } from "@/lib/types";

const PREVIEW_COUNT = 2;

export type PublicCoupon = {
  code: string;
  type: CouponType;
  value_inr: number;
  min_subtotal_inr: number;
  first_order_only: boolean;
};

type AvailableCouponsPickerProps = {
  coupons: PublicCoupon[];
  applyingCoupon: boolean;
  onApply: (code: string) => void;
};

function CouponPill({
  coupon,
  applyingCoupon,
  onApply,
  className = "",
}: {
  coupon: PublicCoupon;
  applyingCoupon: boolean;
  onApply: (code: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={applyingCoupon}
      onClick={() => onApply(coupon.code)}
      className={`rounded-full px-3 py-1.5 text-left text-xs ring-1 transition bg-cream text-chocolate ring-chocolate/10 hover:ring-chocolate/25 disabled:opacity-50 ${className}`}
    >
      <span className="font-semibold">{coupon.code}</span>
      <span className="ml-1 text-chocolate/60">· {describeCoupon(coupon)}</span>
    </button>
  );
}

export function AvailableCouponsPicker({
  coupons,
  applyingCoupon,
  onApply,
}: AvailableCouponsPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (coupons.length === 0) return null;

  const preview = coupons.slice(0, PREVIEW_COUNT);
  const hasMore = coupons.length > PREVIEW_COUNT;

  const handleApply = (code: string) => {
    onApply(code);
    setModalOpen(false);
  };

  return (
    <>
      <div className="mt-3">
        <p className="text-xs text-chocolate/50">Available offers</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {preview.map((coupon) => (
            <CouponPill
              key={coupon.code}
              coupon={coupon}
              applyingCoupon={applyingCoupon}
              onApply={handleApply}
            />
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-chocolate underline decoration-chocolate/30 underline-offset-2"
            >
              View all ({coupons.length})
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setModalOpen(false)}
            aria-label="Close"
          />
          <div className="relative z-10 max-h-[70vh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-cream pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-chocolate/10 px-5 py-4">
              <h3 className="font-display text-lg font-semibold text-chocolate">
                Available coupons
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-chocolate ring-1 ring-chocolate/10"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="max-h-[calc(70vh-4rem)] overflow-y-auto p-4">
              {coupons.map((coupon) => (
                <li
                  key={coupon.code}
                  className="border-b border-chocolate/8 py-3 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-chocolate">{coupon.code}</p>
                      <p className="mt-0.5 text-xs text-chocolate/60">
                        {describeCoupon(coupon)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={applyingCoupon}
                      onClick={() => handleApply(coupon.code)}
                      className="shrink-0 rounded-full bg-chocolate px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-50"
                    >
                      {applyingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
