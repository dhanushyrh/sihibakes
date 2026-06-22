"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Truck,
  PartyPopper,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { HeartDivider } from "@/components/landing/HeartDivider";
import { InstagramIcon } from "@/components/landing/InstagramIcon";
import { HorizontalMarquee } from "@/components/store/HorizontalMarquee";
import { formatDisplayPhone, instagramHref, telHref, whatsappHref } from "@/lib/storefront";
import { formatCurrency } from "@/lib/delivery";
import { formatReviewDate } from "@/lib/reviews";
import { getUnitPrice } from "@/lib/pricing";
import { BRAND } from "@/lib/constants";
import type { CustomerReview, Product } from "@/lib/types";
import type { StorefrontDetails } from "@/lib/storefront";

const OPTIONS = [
  {
    id: "delivery",
    title: "Delivery",
    subtitle: "To your doorstep",
    icon: Truck,
    href: "/orders/delivery/menu",
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
    id: "enquiry",
    title: "Enquiry",
    subtitle: "Ask us anything",
    icon: MessageCircle,
    href: "/orders/enquiry?type=general",
    style: "bg-white text-chocolate ring-1 ring-chocolate/15",
  },
] as const;

function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ProductMarqueeCard({ product }: { product: Product }) {
  const unitPrice = getUnitPrice(product);
  const hasDiscount = (product.discount_percent ?? 0) > 0;

  return (
    <Link
      href="/orders/delivery/menu"
      className="flex w-[132px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-chocolate/8 transition active:scale-[0.98]"
    >
      <div className="relative aspect-square overflow-hidden bg-parchment">
        <Image
          src={product.image_path || "/hero-tiramisu.png"}
          alt={product.title}
          fill
          className="object-cover"
          sizes="132px"
        />
      </div>
      <div className="px-2.5 py-2">
        <p className="line-clamp-2 font-display text-xs font-semibold leading-tight text-chocolate">
          {product.title}
        </p>
        <p className="mt-1 text-[11px] font-medium text-chocolate/75">
          {formatCurrency(unitPrice)}
          {hasDiscount && (
            <span className="ml-1 text-[10px] font-normal text-chocolate/40 line-through">
              {formatCurrency(product.price_inr)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

function ReviewMarqueeCard({ review }: { review: CustomerReview }) {
  return (
    <article className="w-[260px] shrink-0 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-chocolate/8">
      <p className="line-clamp-3 text-xs leading-relaxed text-chocolate/75">
        &ldquo;{review.quote}&rdquo;
      </p>
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <p className="truncate font-display text-sm font-semibold text-chocolate">
          {review.name}
        </p>
        <p className="shrink-0 text-[10px] text-chocolate/45">
          {formatReviewDate(review.reviewed_at)}
        </p>
      </div>
    </article>
  );
}

export function OrdersHub({
  store,
  products,
  reviews,
}: {
  store: StorefrontDetails;
  products: Product[];
  reviews: CustomerReview[];
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-lg flex-col px-4 py-6 pb-[env(safe-area-inset-bottom)]">
      <div className="text-center">
        <Image
          src="/orders-logo.png"
          alt={`${BRAND.name} — ${BRAND.tagline}`}
          width={603}
          height={406}
          className="mx-auto h-auto w-36"
          priority
        />
        {products.length > 0 && (
          <div className="-mx-4 mt-4">
            <HorizontalMarquee direction="left" durationSeconds={32}>
              {products.map((product) => (
                <ProductMarqueeCard key={product.id} product={product} />
              ))}
            </HorizontalMarquee>
          </div>
        )}
        <HeartDivider className="my-3" />
        <h1 className="font-display text-[clamp(1.5rem,5vw,2rem)] font-semibold text-chocolate">
          How can we help?
        </h1>
      </div>

      <div className="mt-8 flex flex-1 flex-col gap-2.5">
        {OPTIONS.map((option) => (
          <Link
            key={option.id}
            href={option.href}
            className={`group flex items-center gap-3.5 rounded-2xl px-4 py-4 transition active:scale-[0.99] ${option.style}`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/10">
              <option.icon size={22} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="font-display text-lg font-semibold">{option.title}</p>
              <p className="mt-0.5 text-xs opacity-75">{option.subtitle}</p>
            </div>
            <ChevronRight
              size={18}
              className="shrink-0 opacity-60 transition group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>

      {reviews.length > 0 && (
        <div className="-mx-4 mt-6">
          <p className="mb-2.5 px-4 text-center text-[10px] uppercase tracking-[0.2em] text-chocolate/40">
            Loved by customers
          </p>
          <HorizontalMarquee direction="right" durationSeconds={40}>
            {reviews.map((review) => (
              <ReviewMarqueeCard key={review.id} review={review} />
            ))}
          </HorizontalMarquee>
        </div>
      )}

      <div className="mt-8 space-y-4">
        <p className="text-center text-[11px] uppercase tracking-[0.25em] text-chocolate/45">
          Contact us
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href={whatsappHref(store.phone, "Hi Sihi Bakes! I'd like to place an order.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] transition hover:bg-[#25D366]/20 active:scale-95"
            aria-label="Chat on WhatsApp"
          >
            <WhatsAppIcon size={24} />
          </a>
          <a
            href={instagramHref()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-chocolate/8 text-chocolate transition hover:bg-chocolate/12 active:scale-95"
            aria-label="Follow on Instagram"
          >
            <InstagramIcon size={24} />
          </a>
        </div>
        <p className="text-center text-xs text-chocolate/50">
          Prefer to call?{"\u00a0"}
          <a
            href={telHref(store.phone)}
            className="whitespace-nowrap font-medium text-chocolate underline"
          >
            {formatDisplayPhone(store.phone)}
          </a>
        </p>
      </div>
    </main>
  );
}
