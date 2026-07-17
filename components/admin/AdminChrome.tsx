"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { DeliveryModeBanner } from "@/components/admin/delivery-mode/DeliveryModeBanner";
import { readDeliveryModeEnabled } from "@/lib/delivery-mode";

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [modeOn, setModeOn] = useState(false);
  const isDeliveryRoute = pathname === "/admin/delivery-mode";

  const sync = useCallback(() => {
    setModeOn(readDeliveryModeEnabled());
  }, []);

  useEffect(() => {
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "sihi-admin-delivery-mode") sync();
    };
    const onCustom = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("sihi-delivery-mode-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sihi-delivery-mode-change", onCustom);
    };
  }, [sync]);

  if (isDeliveryRoute) {
    return <div className="min-h-screen bg-[#F5E6D3]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#F5E6D3]">
      <AdminSidebar />
      <AdminTopBar />
      <main className="min-h-screen md:ml-64">
        {modeOn ? <DeliveryModeBanner /> : null}
        <div className="overflow-y-auto overflow-x-hidden p-4 pt-16 md:p-8 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
