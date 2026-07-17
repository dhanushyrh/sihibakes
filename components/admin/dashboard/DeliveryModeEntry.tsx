"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Truck } from "lucide-react";
import {
  readDeliveryModeEnabled,
  setDeliveryModeEnabled,
} from "@/lib/delivery-mode";

export function DeliveryModeEntry() {
  const router = useRouter();
  const [modeOn, setModeOn] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  const syncMode = useCallback(() => {
    setModeOn(readDeliveryModeEnabled());
  }, []);

  const loadCount = useCallback(async () => {
    setLoadingCount(true);
    try {
      const res = await fetch("/api/admin/delivery-mode");
      const data = await res.json();
      if (res.ok) setCount(typeof data.count === "number" ? data.count : 0);
      else setCount(null);
    } catch {
      setCount(null);
    } finally {
      setLoadingCount(false);
    }
  }, []);

  useEffect(() => {
    syncMode();
    void loadCount();
    const onCustom = () => syncMode();
    window.addEventListener("sihi-delivery-mode-change", onCustom);
    return () => window.removeEventListener("sihi-delivery-mode-change", onCustom);
  }, [syncMode, loadCount]);

  const enter = () => {
    setDeliveryModeEnabled(true);
    setModeOn(true);
    router.push("/admin/delivery-mode");
  };

  const exit = () => {
    setDeliveryModeEnabled(false);
    setModeOn(false);
  };

  return (
    <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-[#4B2C20]/10 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#4B2C20]" />
            <h2 className="font-medium text-[#4B2C20]">Delivery Mode</h2>
            {loadingCount ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4B2C20]/40" />
            ) : count != null ? (
              <span className="rounded-full bg-[#F5E6D3] px-2 py-0.5 text-xs font-semibold text-[#4B2C20]">
                {count} stop{count === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            Self deliveries out for delivery — phone-friendly run sheet for the
            road.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {modeOn ? (
            <>
              <button
                type="button"
                onClick={enter}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#4B2C20] px-4 text-sm font-semibold text-white"
              >
                <Truck className="h-4 w-4" />
                Open Delivery Mode
              </button>
              <button
                type="button"
                onClick={exit}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#4B2C20] ring-1 ring-[#4B2C20]/15"
              >
                <LogOut className="h-4 w-4" />
                Exit
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enter}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4B2C20] px-5 text-sm font-semibold text-white sm:w-auto"
            >
              <Truck className="h-4 w-4" />
              Enter Delivery Mode
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
