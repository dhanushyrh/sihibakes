"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { OrderSourceBadges } from "@/components/admin/orders/OrderBadges";
import {
  deliveryStopMapsHref,
  deliveryStopWhatsAppMessage,
  formatDeliveryStopAddress,
} from "@/lib/delivery-mode";
import { orderShortId } from "@/lib/order-badges";
import { formatDeliveryWindow, formatOrderItems } from "@/lib/order-roster";
import { telHref, whatsappHref } from "@/lib/storefront";
import type { Order } from "@/lib/types";

type DeliveryStopCardProps = {
  order: Order;
  busy: boolean;
  onMarkDelivered: (order: Order) => Promise<void>;
};

export function DeliveryStopCard({
  order,
  busy,
  onMarkDelivered,
}: DeliveryStopCardProps) {
  const [confirming, setConfirming] = useState(false);
  const address = formatDeliveryStopAddress(order);
  const mapsHref = deliveryStopMapsHref(order);
  const waMessage = deliveryStopWhatsAppMessage(order);
  const callHref = telHref(order.phone);
  const waHref = whatsappHref(order.phone, waMessage);
  const altCallHref = order.alt_phone ? telHref(order.alt_phone) : null;

  const confirm = async () => {
    await onMarkDelivered(order);
    setConfirming(false);
  };

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#4B2C20]/10 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight text-[#4B2C20]">
            {order.customer_name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-[#4B2C20]/55">
              #{orderShortId(order.order_number)}
            </span>
            <OrderSourceBadges
              orderSource={order.order_source}
              paymentMode={order.payment_mode}
              paymentStatus={order.payment_status}
            />
          </div>
        </div>
        <p className="shrink-0 rounded-full bg-[#F5E6D3] px-2.5 py-1 text-xs font-medium text-[#4B2C20]">
          {format(parseISO(order.delivery_date), "d MMM")} ·{" "}
          {formatDeliveryWindow(
            order.delivery_window_start,
            order.delivery_window_end
          )}
        </p>
      </div>

      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex gap-2 rounded-xl bg-[#F5E6D3]/60 p-3 text-[#4B2C20] ring-1 ring-[#4B2C20]/8 transition active:bg-[#F5E6D3]"
      >
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#4B2C20]/60" />
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-snug">{address}</span>
          <span className="mt-1 block text-xs font-medium text-[#4B2C20]/55">
            Open in Maps
          </span>
        </span>
      </a>

      {order.order_items?.length ? (
        <p className="mt-3 text-sm leading-relaxed text-[#4B2C20]/80">
          {formatOrderItems(order.order_items)}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={callHref}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-[#4B2C20] ring-1 ring-[#4B2C20]/15 transition active:bg-[#F5E6D3]"
        >
          <Phone className="h-4 w-4" />
          Call
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366]/15 text-sm font-semibold text-[#128C7E] ring-1 ring-[#25D366]/30 transition active:bg-[#25D366]/25"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>

      {altCallHref ? (
        <a
          href={altCallHref}
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-[#4B2C20]/70 ring-1 ring-[#4B2C20]/10"
        >
          <Phone className="h-3.5 w-3.5" />
          Call alt {order.alt_phone}
        </a>
      ) : null}

      {confirming ? (
        <div className="mt-4 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <p className="text-sm font-medium text-amber-950">
            Mark {order.customer_name} as delivered?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#4B2C20] ring-1 ring-[#4B2C20]/15 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4B2C20] text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(true)}
          className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#4B2C20] text-base font-semibold text-white transition active:bg-[#3d2319] disabled:opacity-50"
        >
          <CheckCircle2 className="h-5 w-5" />
          Mark delivered
        </button>
      )}
    </article>
  );
}
