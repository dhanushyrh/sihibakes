"use client";

import { statusChangeLabel } from "@/lib/order-status-update";
import { FULFILLMENT_PIPELINE } from "@/lib/order-status-transitions";
import type { OrderStatus } from "@/lib/types";
import { Check } from "lucide-react";

type OrderStatusPipelineProps = {
  status: OrderStatus;
};

function pipelineIndex(status: OrderStatus): number {
  if (status === "self_delivered") return 4;
  if (status === "cancelled") return -1;
  return FULFILLMENT_PIPELINE.indexOf(status);
}

export function OrderStatusPipeline({ status }: OrderStatusPipelineProps) {
  const activeIndex = pipelineIndex(status);
  const isCancelled = status === "cancelled";
  const isSelfDelivered = status === "self_delivered";

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-[#4B2C20]/10">
      <p className="text-xs font-medium uppercase tracking-wide text-[#4B2C20]/45">
        Fulfillment flow
      </p>
      {isCancelled ? (
        <p className="mt-2 text-sm text-red-700">This order was cancelled.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
          {FULFILLMENT_PIPELINE.map((step, index) => {
            const isPast = activeIndex > index;
            const isCurrent = activeIndex === index;
            const isLast = index === FULFILLMENT_PIPELINE.length - 1;
            const label =
              isSelfDelivered && step === "delivered"
                ? "Self delivered"
                : statusChangeLabel(step);

            return (
              <li
                key={step}
                className={`flex min-w-0 flex-1 items-center gap-2 sm:flex-col sm:gap-1.5 ${
                  !isLast ? "sm:pr-2" : ""
                }`}
              >
                <div className="flex items-center gap-2 sm:flex-col">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isCurrent
                        ? "bg-[#4B2C20] text-white"
                        : isPast
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-[#F5E6D3] text-[#4B2C20]/45"
                    }`}
                  >
                    {isPast ? <Check size={14} /> : index + 1}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      isCurrent
                        ? "text-[#4B2C20]"
                        : isPast
                          ? "text-emerald-800"
                          : "text-[#4B2C20]/45"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`hidden h-0.5 flex-1 sm:block ${
                      isPast ? "bg-emerald-300" : "bg-[#4B2C20]/10"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}
      {!isCancelled && status === "out_for_delivery" && (
        <p className="mt-3 text-xs text-[#4B2C20]/55">
          Next: mark as partner delivered or self delivered.
        </p>
      )}
      {isSelfDelivered && (
        <p className="mt-3 text-xs text-teal-800">
          Completed by our team — no delivery partner was used.
        </p>
      )}
    </div>
  );
}
