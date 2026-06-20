"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export function AboutStorySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".about-image", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 72%" },
        x: -50,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });
      gsap.from(".about-copy", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 72%" },
        x: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="story"
      ref={sectionRef}
      className="landing-section bg-cream"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:gap-16 md:px-6">
        <div className="about-image relative">
          <div className="overflow-hidden rounded-[2.25rem] bg-surface-card p-3 shadow-[var(--shadow-soft)] md:rounded-[2.75rem] md:p-4">
            <div className="relative aspect-[5/6] overflow-hidden rounded-[1.75rem] md:rounded-[2.25rem]">
              <Image
                src="/landing/classic-tiramisu.png"
                alt="Classic Tiramisu by Sihi"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>

        <div className="about-copy">
          <p className="font-script text-3xl text-gold">Our Story</p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-tight text-chocolate">
            Sweet moments,
            <br />
            delivered to you
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-chocolate/65">
            From our home kitchen in Bangalore, we craft signature tiramisu,
            tres leches, and seasonal bakes in small batches — never
            mass-produced, always made fresh to order.
          </p>
          <p className="mt-4 font-script text-xl text-chocolate/80">
            — The Sihi Team
          </p>
          <Link
            href="#why-us"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-chocolate/20 bg-white/70 px-6 py-3 text-sm font-medium text-chocolate transition hover:bg-white"
          >
            Learn more
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
