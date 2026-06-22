"use client";

import { Tag } from "lucide-react";
import { describeCoupon } from "@/lib/coupon-display";
import type { PublicCoupon } from "@/lib/public-coupons";

type MenuCouponsShowcaseProps = {
  coupons: PublicCoupon[];
};

export function MenuCouponsShowcase({ coupons }: MenuCouponsShowcaseProps) {
  if (coupons.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl bg-gradient-to-br from-gold/25 via-white to-white p-4 ring-1 ring-gold/30">
      <div className="flex items-center gap-2">
        <Tag size={16} className="text-gold" />
        <h2 className="text-sm font-semibold text-chocolate">Offers for you</h2>
      </div>
      <p className="mt-1 text-xs text-chocolate/55">
        Apply a code at checkout — tap to copy.
      </p>
      <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {coupons.map((coupon) => (
          <li key={coupon.code} className="w-[min(82vw,15rem)] shrink-0">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(coupon.code);
              }}
              className="flex h-full w-full flex-col rounded-xl bg-white px-3.5 py-3 text-left ring-1 ring-chocolate/10 transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-base font-semibold tracking-wide text-chocolate">
                  {coupon.code}
                </span>
                {coupon.first_order_only && (
                  <span className="shrink-0 rounded-full bg-gold/25 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-chocolate/70">
                    1st order
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-chocolate/65">
                {describeCoupon(coupon)}
              </p>
              <span className="mt-2 text-[10px] font-medium uppercase tracking-wide text-chocolate/40">
                Tap to copy
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
