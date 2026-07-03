"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/admin/ui/Skeleton";

export const LocationHeatMap = dynamic(
  () =>
    import("@/components/admin/market-analysis/LocationHeatMap").then(
      (mod) => mod.LocationHeatMap
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full rounded-2xl" />,
  }
);
