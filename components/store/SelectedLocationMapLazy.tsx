"use client";

import dynamic from "next/dynamic";

function MapSkeleton() {
  return (
    <div
      className="h-40 w-full animate-pulse rounded-2xl bg-chocolate/5"
      aria-hidden
    />
  );
}

export const SelectedLocationMap = dynamic(
  () =>
    import("@/components/store/SelectedLocationMap").then(
      (mod) => mod.SelectedLocationMap
    ),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);
