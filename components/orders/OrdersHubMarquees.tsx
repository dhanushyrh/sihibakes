"use client";

import Image from "next/image";
import Link from "next/link";
import { HorizontalMarquee } from "@/components/store/HorizontalMarquee";
import { formatReviewDate } from "@/lib/reviews";
import type { HubMarqueeProduct } from "@/lib/data";
import type { CustomerReview } from "@/lib/types";

function ProductMarqueeCard({
  product,
  priority = false,
}: {
  product: HubMarqueeProduct;
  priority?: boolean;
}) {
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
          priority={priority}
        />
      </div>
      <div className="px-2.5 py-2">
        <p className="line-clamp-2 font-display text-xs font-semibold leading-tight text-chocolate">
          {product.title}
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
      <HorizontalMarquee direction="left" durationSeconds={18}>
        {products.map((product, index) => (
          <ProductMarqueeCard
            key={product.id}
            product={product}
            priority={index < 3}
          />
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
    <div className="-mx-4 mt-6 [content-visibility:auto] [contain-intrinsic-size:auto_140px]">
      <p className="mb-2.5 px-4 text-center text-[10px] uppercase tracking-[0.2em] text-chocolate/40">
        Loved by customers
      </p>
      <HorizontalMarquee direction="right" durationSeconds={22}>
        {reviews.map((review) => (
          <ReviewMarqueeCard key={review.id} review={review} />
        ))}
      </HorizontalMarquee>
    </div>
  );
}
