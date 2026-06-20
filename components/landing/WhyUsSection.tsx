"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Heart, Leaf, Sparkles } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: Heart,
    title: "Great Taste",
    desc: "Signature recipes perfected in our kitchen — rich, balanced, unforgettable.",
    highlight: false,
  },
  {
    icon: Leaf,
    title: "Fresh Ingredients",
    desc: "Real mascarpone, fresh espresso, and premium cocoa in every batch we make.",
    highlight: true,
  },
  {
    icon: Sparkles,
    title: "Made to Order",
    desc: "We bake only after you order, so every dessert arrives at peak freshness.",
    highlight: false,
  },
];

export function WhyUsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".feature-card", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        y: 36,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section id="why-us" ref={sectionRef} className="landing-section bg-surface/80">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-script text-3xl text-gold">Why choose us</p>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-chocolate">
            Baked with care, served with love
          </h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className={`feature-card rounded-[1.75rem] p-7 md:p-8 ${
                  feature.highlight
                    ? "bg-surface-warm shadow-[var(--shadow-card)]"
                    : "bg-white/80 ring-1 ring-chocolate/6"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    feature.highlight ? "bg-white/70" : "bg-surface-warm/80"
                  }`}
                >
                  <Icon size={22} className="text-chocolate" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-chocolate">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-chocolate/60">
                  {feature.desc}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
