"use client";

import dynamic from "next/dynamic";

function MapSkeleton() {
  return (
    <div
      className="h-[min(70vh,28rem)] w-full animate-pulse rounded-2xl bg-chocolate/5"
      aria-hidden
    />
  );
}

export const DeliveryLocationPicker = dynamic(
  () =>
    import("@/components/store/DeliveryLocationPicker").then(
      (mod) => mod.DeliveryLocationPicker
    ),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);
