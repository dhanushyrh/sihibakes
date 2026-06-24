"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import type { AdminAlert } from "@/lib/alerts/notify-admin";

export function AdminAlertsBanner({ alerts: initialAlerts }: { alerts: AdminAlert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [dismissing, setDismissing] = useState<string | null>(null);

  if (alerts.length === 0) return null;

  const dismiss = async (id: string) => {
    setDismissing(id);
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } finally {
      setDismissing(null);
    }
  };

  return (
    <div className="mb-6 space-y-2">
      {alerts.map((alert) => {
        const isCritical = alert.severity === "critical";
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-xl px-4 py-3 ring-1 ${
              isCritical
                ? "bg-red-50 text-red-950 ring-red-200"
                : "bg-amber-50 text-amber-950 ring-amber-200"
            }`}
            role="alert"
          >
            <AlertTriangle
              size={18}
              className={`mt-0.5 shrink-0 ${isCritical ? "text-red-600" : "text-amber-600"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs opacity-90">{alert.message}</p>
              {alert.order_id && (
                <Link
                  href={`/admin/orders/${alert.order_id}`}
                  className="mt-2 inline-block text-xs font-medium underline underline-offset-2"
                >
                  View order
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => void dismiss(alert.id)}
              disabled={dismissing === alert.id}
              className="shrink-0 rounded-full p-1 opacity-70 transition hover:opacity-100 disabled:opacity-40"
              aria-label="Dismiss alert"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
