"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";
import { TAG_OPTIONS } from "@/lib/constants";
import type { Product, ProductTag } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

const FALLBACK_PRODUCTS = [
  {
    name: "Classic Tiramisu",
    desc: "Mascarpone, espresso and love in every layer.",
    image: "/landing/classic-tiramisu.png",
    badge: "Signature",
  },
  {
    name: "Tres Leches",
    desc: "Three milks. One unforgettable experience.",
    image: "/landing/tres-leches.png",
    badge: "Must Try",
  },
  {
    name: "Tres Leches Slice",
    desc: "The cake that melts on your tongue.",
    image: "/landing/tres-leches-slice.png",
    badge: "Bestseller",
  },
];

function primaryTagLabel(tags: ProductTag[]): string | null {
  for (const opt of TAG_OPTIONS) {
    if (tags.includes(opt.key)) return opt.label;
  }
  return null;
}

export function ProductsSection({ products }: { products: Product[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const useFallback = products.length === 0;

  useGSAP(
    () => {
      gsap.from(".product-card", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 72%" },
        y: 48,
        opacity: 0,
        duration: 0.75,
        stagger: 0.12,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section id="products" ref={sectionRef} className="landing-section bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-script text-3xl text-gold">Our menu</p>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-semibold text-chocolate">
            Your Sihi favourites
          </h2>
          <p className="mt-3 text-sm text-chocolate/60">
            {useFallback
              ? "Handcrafted signatures from our kitchen"
              : "Fresh from our menu — order for delivery today"}
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {useFallback
            ? FALLBACK_PRODUCTS.map((product) => (
                <article
                  key={product.name}
                  className="product-card group overflow-hidden rounded-[1.75rem] bg-surface-card p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="relative aspect-square overflow-hidden rounded-[1.35rem] bg-white">
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-chocolate px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-cream">
                      {product.badge}
                    </span>
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                  <div className="px-1 pb-1 pt-5 text-center">
                    <h3 className="font-display text-xl font-semibold text-chocolate">
                      {product.name}
                    </h3>
                    <p className="mt-1.5 text-sm text-chocolate/55">{product.desc}</p>
                  </div>
                </article>
              ))
            : products.map((product) => {
                const badge = primaryTagLabel(product.tags);
                const soldOut = product.sold_out_today || !product.is_active;
                const price = getUnitPrice(product);

                return (
                  <Link
                    key={product.id}
                    href="/orders"
                    className={`product-card group block overflow-hidden rounded-[1.75rem] bg-surface-card p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)] ${
                      soldOut ? "opacity-70" : ""
                    }`}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-[1.35rem] bg-white">
                      {badge && (
                        <span className="absolute left-3 top-3 z-10 rounded-full bg-chocolate px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-cream">
                          {badge}
                        </span>
                      )}
                      {soldOut && (
                        <span className="absolute right-3 top-3 z-10 rounded-full bg-chocolate/80 px-2.5 py-1 text-[9px] font-semibold uppercase text-cream">
                          Sold out
                        </span>
                      )}
                      <Image
                        src={product.image_path || "/hero-tiramisu.png"}
                        alt={product.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    </div>
                    <div className="px-1 pb-1 pt-5 text-center">
                      <h3 className="font-display text-xl font-semibold text-chocolate">
                        {product.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-chocolate/55">
                        {product.description}
                      </p>
                      <p className="mt-2 font-medium text-chocolate">
                        {formatCurrency(price)}
                        {product.serves > 1 && (
                          <span className="text-xs font-normal text-chocolate/45">
                            {" "}
                            · serves {product.serves}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/orders"
            className="group inline-flex items-center gap-2 rounded-full bg-chocolate px-8 py-3.5 text-sm font-medium text-cream transition hover:bg-chocolate-dark"
          >
            Order now
            <ArrowRight size={16} className="transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
