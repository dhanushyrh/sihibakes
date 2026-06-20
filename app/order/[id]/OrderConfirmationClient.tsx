"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CheckCircle, MessageCircle } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { formatCurrency } from "@/lib/delivery";
import { orderItemTitle } from "@/lib/order-roster";
import { whatsappHref } from "@/lib/storefront";
import type { Order, OrderItem } from "@/lib/types";

type OrderResponse = Order & {
  order_items?: OrderItem[];
  shop_phone?: string | null;
};

export default function OrderConfirmationClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<OrderResponse | { error: string } | null>(
    null
  );

  useEffect(() => {
    params.then((p) => {
      setOrderNumber(p.id);
      if (phone) {
        fetch(`/api/orders/${p.id}?phone=${encodeURIComponent(phone)}`)
          .then((r) => r.json())
          .then(setOrder)
          .catch(() => setOrder({ error: "Could not load order" }));
      }
    });
  }, [params, phone]);

  const shopPhone =
    order && !("error" in order) ? order.shop_phone?.trim() : "";
  const whatsappMessage = orderNumber
    ? `Hi Sihi Bakes! I just placed order #${orderNumber}.`
    : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <OrderFlowHeader title="Order confirmed" />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-chocolate/10">
            <CheckCircle className="text-chocolate" size={36} strokeWidth={1.5} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-chocolate">
            Order placed!
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-chocolate/65">
            Thank you for ordering from Sihi Bakes. We&apos;ll share delivery
            updates and payment details with you on WhatsApp shortly.
          </p>
          {orderNumber && (
            <p className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-medium text-chocolate ring-1 ring-chocolate/10">
              Order #{orderNumber}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-chocolate/10">
          <div className="flex items-start gap-3">
            <MessageCircle size={20} className="mt-0.5 shrink-0 text-[#25D366]" />
            <div>
              <p className="text-sm font-medium text-chocolate">
                WhatsApp updates
              </p>
              <p className="mt-1 text-sm leading-relaxed text-chocolate/60">
                Keep an eye on WhatsApp — we&apos;ll confirm your slot, address,
                and any payment link if needed.
              </p>
              {shopPhone && (
                <a
                  href={whatsappHref(shopPhone, whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1fb855]"
                >
                  <MessageCircle size={16} />
                  Message us on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        {order && "error" in order && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {order.error}
          </p>
        )}

        {order && !("error" in order) && (
          <div className="mt-4 w-full rounded-2xl bg-white p-4 text-left text-sm ring-1 ring-chocolate/10">
            {order.order_items && order.order_items.length > 0 && (
              <div className="border-b border-chocolate/10 pb-3">
                <p className="text-xs font-medium text-chocolate/50">Items</p>
                <ul className="mt-2 space-y-1.5">
                  {order.order_items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-chocolate">
                        {orderItemTitle(item)}{" "}
                        <span className="text-chocolate/50">
                          × {item.quantity}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium">
                        {formatCurrency(item.line_total_inr)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex justify-between">
              <span className="text-chocolate/60">Total</span>
              <span className="font-semibold">
                {formatCurrency(order.total_inr)}
              </span>
            </div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="shrink-0 text-chocolate/60">Delivery</span>
              <span className="text-right">
                {format(parseISO(order.delivery_date), "EEE, d MMM")} ·{" "}
                {order.delivery_window_start?.slice(0, 5)} –{" "}
                {order.delivery_window_end?.slice(0, 5)}
              </span>
            </div>
          </div>
        )}

        <div className="mt-auto space-y-3 pt-8">
          <Link
            href="/orders"
            className="block w-full rounded-full bg-chocolate py-4 text-center text-sm font-medium text-cream transition hover:bg-chocolate-dark"
          >
            Back to orders
          </Link>
          <Link
            href="/"
            className="block w-full rounded-full border border-chocolate/20 py-4 text-center text-sm font-medium text-chocolate"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
