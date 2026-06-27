"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, Sparkles, type LucideIcon } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import {
  formatDeliveryDateLabel,
  formatSlotTime,
  getSameDayBlockMessage,
  type DeliveryModeAvailability,
} from "@/lib/delivery-mode-availability";
import { shopDateKey } from "@/lib/shop-timezone";

function ModeCard({
  title,
  subtitle,
  detail,
  disabled,
  disabledMessage,
  icon: Icon,
  accent,
  onSelect,
  cta,
}: {
  title: string;
  subtitle: string;
  detail: string;
  disabled?: boolean;
  disabledMessage?: string;
  icon: LucideIcon;
  accent: "chocolate" | "gold";
  onSelect: () => void;
  cta: string;
}) {
  const accentStyles =
    accent === "chocolate"
      ? "bg-chocolate text-cream ring-chocolate/20"
      : "bg-gold text-chocolate ring-gold/30";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`group w-full rounded-2xl p-4 text-left transition active:scale-[0.99] ${
        disabled
          ? "cursor-not-allowed bg-white/70 opacity-75 ring-1 ring-chocolate/10"
          : `${accentStyles} shadow-sm ring-1 hover:shadow-md`
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            disabled ? "bg-chocolate/8 text-chocolate/35" : "bg-black/10"
          }`}
        >
          <Icon size={22} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight">{title}</p>
          <p
            className={`mt-1 text-xs ${
              disabled ? "text-chocolate/50" : "opacity-80"
            }`}
          >
            {subtitle}
          </p>
          <p
            className={`mt-2 text-sm ${
              disabled ? "text-chocolate/45" : "opacity-90"
            }`}
          >
            {detail}
          </p>
          {disabled && disabledMessage && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800 ring-1 ring-red-200">
              {disabledMessage}
            </p>
          )}
          {!disabled && (
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] opacity-90">
              {cta}
              <span className="transition group-hover:translate-x-0.5">→</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function DeliveryModeChoiceClient({
  availability,
}: {
  availability: DeliveryModeAvailability;
}) {
  const router = useRouter();
  const { setDeliverySchedule } = useDeliverySession();
  const today = shopDateKey();

  const earliestSameDaySlot = availability.sameDaySlots[0];
  const sameDayDetail = earliestSameDaySlot
    ? `Earliest slot ${formatSlotTime(earliestSameDaySlot.window_start)} – ${formatSlotTime(earliestSameDaySlot.window_end)}`
    : "No slots available today";

  const preOrderDetail =
    availability.preOrderDates.length > 0
      ? availability.preOrderDates
          .slice(0, 3)
          .map((d) => formatDeliveryDateLabel(d))
          .join(" · ")
      : "No future dates available";

  const handleSameDay = () => {
    setDeliverySchedule("same_day", today);
    router.push("/orders/delivery/menu");
  };

  const handlePreOrder = () => {
    const date = availability.defaultPreOrderDate;
    if (!date) return;
    setDeliverySchedule("pre_order", date);
    router.push("/orders/delivery/menu");
  };

  return (
    <div className="flex min-h-screen flex-col pb-[env(safe-area-inset-bottom)]">
      <OrderFlowHeader title="Delivery" backHref="/orders" />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-chocolate/45">
            Fresh to your door
          </p>
          <h1 className="mt-2 font-display text-[clamp(1.35rem,4.5vw,1.75rem)] font-semibold leading-snug text-chocolate">
            When would you like your desserts?
          </h1>
          <p className="mt-2 text-sm text-chocolate/55">
            Choose same-day delivery or plan ahead with a pre-order.
          </p>
        </div>

        <div className="mt-8 flex flex-1 flex-col gap-3">
          <ModeCard
            title="Same Day Delivery"
            subtitle="Today only · fastest route"
            detail={sameDayDetail}
            disabled={!availability.sameDayEnabled}
            disabledMessage={
              availability.sameDayReason
                ? getSameDayBlockMessage(availability.sameDayReason)
                : undefined
            }
            icon={Sparkles}
            accent="chocolate"
            onSelect={handleSameDay}
            cta="Order for today"
          />

          <ModeCard
            title="Pre-order"
            subtitle="Choose from the next 3 available dates"
            detail={preOrderDetail}
            disabled={!availability.preOrderEnabled}
            disabledMessage={
              !availability.preOrderEnabled
                ? "No pre-order dates available right now."
                : undefined
            }
            icon={CalendarDays}
            accent="gold"
            onSelect={handlePreOrder}
            cta="Choose a future date"
          />
        </div>

        {availability.sameDayEnabled && (
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-chocolate/45">
            <Clock3 size={14} />
            Same-day slots need at least 60 minutes notice
          </p>
        )}

        {!availability.ordersAccepting && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-800 ring-1 ring-red-200">
            We&apos;re not taking orders right now. Please check back soon.
          </p>
        )}
      </main>
    </div>
  );
}
