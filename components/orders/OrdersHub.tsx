"use client";

import Link from "next/link";
import {
  Truck,
  PartyPopper,
  CalendarClock,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { HeartDivider } from "@/components/landing/HeartDivider";
import { telHref } from "@/lib/storefront";
import { formatDeliveryFenceShort } from "@/lib/delivery-fence";
import type { StorefrontDetails } from "@/lib/storefront";

const OPTIONS = [
  {
    id: "delivery",
    title: "Delivery",
    subtitle: "To your doorstep",
    icon: Truck,
    href: "/orders/delivery",
    style: "bg-chocolate text-cream",
  },
  {
    id: "kitty-party",
    title: "Kitty Party",
    subtitle: "Bulk orders for gatherings",
    icon: PartyPopper,
    href: "/orders/enquiry?type=kitty-party",
    style: "bg-gold text-chocolate",
  },
  {
    id: "pre-order",
    title: "Pre-Order",
    subtitle: "Plan ahead for occasions",
    icon: CalendarClock,
    href: "/orders/enquiry?type=pre-order",
    style: "bg-kraft text-chocolate",
  },
  {
    id: "enquiry",
    title: "Enquiry",
    subtitle: "Ask us anything",
    icon: MessageCircle,
    href: "/orders/enquiry?type=general",
    style: "bg-white text-chocolate ring-1 ring-chocolate/15",
  },
] as const;

export function OrdersHub({ store }: { store: StorefrontDetails }) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-8rem)] w-full max-w-lg flex-col px-4 py-8">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.35em] text-chocolate/55">
          Start here
        </p>
        <HeartDivider className="my-4" />
        <h1 className="font-display text-3xl font-semibold text-chocolate">
          How can we help?
        </h1>
        <p className="mt-3 text-sm text-chocolate/60">
          Delivery: {formatDeliveryFenceShort(store.delivery_fence)}
          {store.store_address ? ` · ${store.store_address}` : ""}
        </p>
      </div>

      <div className="mt-10 flex flex-1 flex-col gap-3">
        {OPTIONS.map((option) => (
          <Link
            key={option.id}
            href={option.href}
            className={`group flex items-center gap-4 rounded-2xl px-5 py-5 transition active:scale-[0.99] ${option.style}`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/10">
              <option.icon size={24} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="font-display text-xl font-semibold">{option.title}</p>
              <p className="mt-0.5 text-sm opacity-75">{option.subtitle}</p>
            </div>
            <ChevronRight
              size={20}
              className="shrink-0 opacity-60 transition group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>

      {store.phone && (
        <p className="mt-8 text-center text-xs text-chocolate/50">
          Prefer to call?{" "}
          <a href={telHref(store.phone)} className="font-medium text-chocolate underline">
            {store.phone}
          </a>
        </p>
      )}
    </main>
  );
}
