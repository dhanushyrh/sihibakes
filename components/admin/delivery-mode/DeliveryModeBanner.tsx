"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, X } from "lucide-react";
import { setDeliveryModeEnabled } from "@/lib/delivery-mode";

export function DeliveryModeBanner() {
  const router = useRouter();

  const exit = () => {
    setDeliveryModeEnabled(false);
    router.refresh();
  };

  return (
    <div className="sticky top-14 z-30 border-b border-amber-200 bg-amber-50 px-4 py-2.5 md:top-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-950">
          <Truck className="h-4 w-4" />
          Delivery Mode on
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/delivery-mode"
            className="rounded-full bg-[#4B2C20] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Open run sheet
          </Link>
          <button
            type="button"
            onClick={exit}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 ring-1 ring-amber-200"
          >
            <X className="h-3.5 w-3.5" />
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
