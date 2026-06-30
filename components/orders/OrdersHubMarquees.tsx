"use client";

import Image from "next/image";
import Link from "next/link";
import { HorizontalMarquee } from "@/components/store/HorizontalMarquee";
import { formatCurrency } from "@/lib/delivery";
import { formatReviewDate } from "@/lib/reviews";
import { getUnitPrice } from "@/lib/pricing";
import type { HubMarqueeProduct } from "@/lib/data";
import type { CustomerReview } from "@/lib/types";

function ProductMarqueeCard({ product }: { product: HubMarqueeProduct }) {
  const unitPrice = getUnitPrice({
    price_inr: product.price_inr,
    discount_percent: product.discount_percent,
  } as Parameters<typeof getUnitPrice>[0]);
  const hasDiscount = (product.discount_percent ?? 0) > 0;

  return (
    <Link
      href="/orders/delivery"
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

export function OrdersHubProductMarquee({
  products,
}: {
  products: HubMarqueeProduct[];
}) {
  if (products.length === 0) return null;

  return (
    <div className="-mx-4 mt-4">
      <HorizontalMarquee direction="left" durationSeconds={32}>
        {products.map((product) => (
          <ProductMarqueeCard key={product.id} product={product} />
        ))}
      </HorizontalMarquee>
    </div>
  );
}

export function OrdersHubReviewMarquee({
  reviews,
}: {
  reviews: CustomerReview[];
}) {
  if (reviews.length === 0) return null;

  return (
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
  );
}
