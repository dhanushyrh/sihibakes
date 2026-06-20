import { formatCurrency } from "@/lib/delivery";
import type { CouponMetric } from "@/lib/analytics";
import { Ticket } from "lucide-react";

interface CouponPerformanceProps {
  coupons: CouponMetric[];
  totalDiscount: number;
}

export function CouponPerformance({
  coupons,
  totalDiscount,
}: CouponPerformanceProps) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#4B2C20]">Coupon performance</h3>
          <p className="mt-0.5 text-xs text-[#4B2C20]/50">
            {formatCurrency(totalDiscount)} total discounts given
          </p>
        </div>
        <Ticket size={18} className="text-[#4B2C20]/30" />
      </div>
      {coupons.length === 0 ? (
        <p className="mt-6 text-center text-xs text-[#4B2C20]/40">
          No coupons used this period
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {coupons.map((c) => (
            <li
              key={c.code}
              className="flex items-center justify-between rounded-xl bg-[#F5E6D3]/50 px-3 py-2"
            >
              <span className="font-mono text-sm font-medium text-[#4B2C20]">
                {c.code}
              </span>
              <div className="text-right text-xs">
                <span className="font-semibold text-[#4B2C20]">{c.uses} uses</span>
                <span className="ml-2 text-[#4B2C20]/50">
                  −{formatCurrency(c.discountGiven)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
