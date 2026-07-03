"use client";

import dynamic from "next/dynamic";

function CouponsSkeleton() {
  return (
    <div
      className="h-12 w-full animate-pulse rounded-xl bg-chocolate/5"
      aria-hidden
    />
  );
}

export const AvailableCouponsPicker = dynamic(
  () =>
    import("@/components/store/AvailableCouponsPicker").then(
      (mod) => mod.AvailableCouponsPicker
    ),
  {
    ssr: false,
    loading: () => <CouponsSkeleton />,
  }
);
