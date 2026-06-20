"use client";

import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const QUALITY_POINTS = [
  "Real mascarpone — rich, creamy and smooth",
  "Fresh espresso — bold aroma, perfect balance",
  "Soft ladyfingers — light, airy and delicate",
  "Rich cocoa finish — the perfect bittersweet touch",
  "Handcrafted in small batches, never mass-produced",
];

export function QualitySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".quality-panel", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 72%" },
        y: 40,
        opacity: 0,
        duration: 0.85,
        ease: "power3.out",
      });
      gsap.from(".quality-check", {
        scrollTrigger: { trigger: ".quality-checklist", start: "top 78%" },
        x: -16,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="landing-section bg-cream">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="quality-panel overflow-hidden rounded-[2.25rem] bg-surface-warm/70 p-5 shadow-[var(--shadow-soft)] md:rounded-[2.75rem] md:p-8 lg:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-surface-card md:rounded-[2rem]">
              <Image
                src="/landing/quality-ingredients.png"
                alt="Quality ingredients for Sihi desserts"
                width={560}
                height={560}
                className="h-auto w-full"
              />
            </div>

            <div>
              <p className="font-script text-3xl text-gold">Made with love</p>
              <h2 className="mt-2 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-tight text-chocolate">
                Our commitment to quality
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-chocolate/65 md:text-base">
                What makes a good tiramisu? The same standards we apply to
                every dessert — premium ingredients, patience, and passion in
                every layer.
              </p>

              <ul className="quality-checklist mt-8 space-y-3.5">
                {QUALITY_POINTS.map((point) => (
                  <li
                    key={point}
                    className="quality-check flex items-start gap-3 text-sm text-chocolate/75"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-chocolate text-cream">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
