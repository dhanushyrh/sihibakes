"use client";

import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star } from "lucide-react";
import { reviewImageSrc } from "@/lib/reviews";
import type { CustomerReview } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

export function ReviewsSection({ reviews }: { reviews: CustomerReview[] }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".review-card", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 72%" },
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section id="reviews" ref={sectionRef} className="landing-section bg-cream">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-script text-3xl text-gold">Customer love</p>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-semibold text-chocolate">
            Shared by our community
          </h2>
          <p className="mt-3 text-sm text-chocolate/60">
            Real moments from Sihi customers across Bangalore
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="review-card overflow-hidden rounded-[1.75rem] bg-white shadow-[var(--shadow-card)] ring-1 ring-chocolate/6"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-surface-card">
                <Image
                  src={reviewImageSrc(review.image_path)}
                  alt={`${review.name} shared their ${review.product}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {review.product && (
                  <span className="absolute bottom-3 left-3 rounded-full bg-chocolate/85 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-cream backdrop-blur-sm">
                    {review.product}
                  </span>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className="fill-gold text-gold"
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-chocolate/75">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <p className="mt-4 font-display text-base font-semibold text-chocolate">
                  {review.name}
                </p>
                {review.area && (
                  <p className="text-xs text-chocolate/50">{review.area}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
