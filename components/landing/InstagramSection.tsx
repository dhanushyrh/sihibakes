"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import type { StorefrontDetails } from "@/lib/storefront";
import { telHref } from "@/lib/storefront";

gsap.registerPlugin(ScrollTrigger);

const GALLERY = [
  { src: "/landing/hero-scoop.png", alt: "Tiramisu scoop" },
  { src: "/landing/classic-tiramisu.png", alt: "Classic Tiramisu" },
  { src: "/landing/tres-leches.png", alt: "Tres Leches" },
  { src: "/landing/kitchen.png", alt: "From our kitchen" },
  { src: "/landing/layers-story.png", alt: "Every layer tells a story" },
  { src: "/landing/brand.png", alt: "Sihi brand" },
];

export function InstagramSection({ store }: { store: StorefrontDetails }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".insta-item", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
        scale: 0.92,
        opacity: 0,
        duration: 0.55,
        stagger: 0.07,
        ease: "power3.out",
      });

      if (trackRef.current) {
        gsap.to(trackRef.current, {
          x: "-=180",
          duration: 22,
          repeat: -1,
          ease: "none",
        });
      }
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="overflow-hidden border-t border-chocolate/6 bg-cream py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 text-center md:px-6">
        <p className="font-script text-3xl text-gold">From our kitchen</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-chocolate md:text-3xl">
          Sweet moments, captured
        </h2>
        {store.phone && (
          <Link
            href={telHref(store.phone)}
            className="mt-4 inline-flex items-center gap-2 text-sm text-chocolate/70 transition hover:text-chocolate"
          >
            <Phone size={16} />
            Call {store.phone}
          </Link>
        )}
      </div>

      <div className="mt-10 overflow-hidden">
        <div ref={trackRef} className="flex w-max gap-4 px-4">
          {[...GALLERY, ...GALLERY].map((item, i) => (
            <div
              key={`${item.src}-${i}`}
              className="insta-item relative h-44 w-44 shrink-0 overflow-hidden rounded-[1.35rem] bg-surface-card shadow-[var(--shadow-card)] md:h-52 md:w-52"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover"
                sizes="208px"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
