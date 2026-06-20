"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-script", { y: 16, opacity: 0, duration: 0.6 })
        .from(".hero-title", { y: 36, opacity: 0, duration: 0.85 }, "-=0.35")
        .from(".hero-cta", { y: 20, opacity: 0, duration: 0.55 }, "-=0.45")
        .from(
          ".hero-image-wrap",
          { x: 40, opacity: 0, duration: 1 },
          "-=0.7"
        )
        .from(".hero-blob", { scale: 0.85, opacity: 0, duration: 1.1 }, "-=1");
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden pt-28 md:pt-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface-warm/40 via-cream to-cream" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 md:grid-cols-2 md:gap-14 md:px-6 md:pb-28">
        <div className="z-10 max-w-lg">
          <p className="hero-script font-script text-3xl text-gold md:text-4xl">
            Handcrafted with love
          </p>
          <h1 className="hero-title mt-3 font-display text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.08] tracking-tight text-chocolate">
            Sweet moments
            <br />
            start here
          </h1>
          <div className="hero-cta mt-8">
            <Link
              href="/orders"
              className="group inline-flex items-center gap-2 rounded-full bg-chocolate px-8 py-4 text-sm font-medium text-cream shadow-[var(--shadow-soft)] transition hover:bg-chocolate-dark"
            >
              Order Now
              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>

        <div className="hero-image-wrap relative mx-auto w-full max-w-md md:max-w-none">
          <div
            className="hero-blob pointer-events-none absolute -right-8 top-1/2 h-[88%] w-[88%] -translate-y-1/2 rounded-[3rem] bg-gradient-to-br from-warm-beige/80 via-surface-warm/50 to-gold/20 blur-sm md:-right-12"
            aria-hidden
          />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.25rem] bg-surface-card shadow-[var(--shadow-soft)] md:rounded-[2.75rem]">
            <Image
              src="/landing/hero-scoop.png"
              alt="Sihi Classic Tiramisu"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 90vw, 45vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
