"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/admin/ui/Skeleton";

export const KitchenLocationMap = dynamic(
  () =>
    import("@/components/admin/settings/KitchenLocationMap").then(
      (mod) => mod.KitchenLocationMap
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-2xl" />,
  }
);
