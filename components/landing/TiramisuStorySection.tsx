"use client";

import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HeartDivider } from "./HeartDivider";

gsap.registerPlugin(ScrollTrigger);

const LAYERS = [
  {
    label: "Rich Cocoa Finish",
    desc: "The perfect bittersweet touch",
    color: "bg-[#3D2B1F]",
    height: "h-14 md:h-16",
  },
  {
    label: "Velvety Mascarpone",
    desc: "Rich, creamy and smooth",
    color: "bg-[#F5F0E6]",
    height: "h-20 md:h-24",
  },
  {
    label: "Espresso-Soaked Ladyfingers",
    desc: "Bold aroma, perfect balance",
    color: "bg-[#8B6914]/40",
    height: "h-16 md:h-20",
  },
  {
    label: "Cream Layer",
    desc: "Light, airy and delicate",
    color: "bg-[#FAF7F2]",
    height: "h-20 md:h-24",
  },
  {
    label: "Foundation",
    desc: "Built on tradition",
    color: "bg-[#6B4E2A]/50",
    height: "h-12 md:h-14",
  },
];

export function TiramisuStorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const layers = gsap.utils.toArray<HTMLElement>(".tiramisu-layer");
      const texts = gsap.utils.toArray<HTMLElement>(".layer-label");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=120%",
          pin: true,
          scrub: 0.8,
        },
      });

      layers.forEach((layer, i) => {
        tl.from(
          layer,
          {
            xPercent: i % 2 === 0 ? -100 : 100,
            opacity: 0,
            duration: 1,
          },
          i * 0.8
        );
        if (texts[i]) {
          tl.from(texts[i], { opacity: 0, y: 10, duration: 0.4 }, i * 0.8 + 0.3);
        }
      });

      gsap.from(".story-copy", {
        scrollTrigger: {
          trigger: ".story-copy",
          start: "top 80%",
        },
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="story"
      ref={sectionRef}
      className="relative bg-chocolate text-cream"
    >
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:px-6 md:py-0">
        <div className="story-copy">
          <p className="text-[11px] uppercase tracking-[0.35em] text-cream/50">
            Our Signature
          </p>
          <HeartDivider className="my-5 [&_span]:bg-cream/25 [&_svg]:fill-cream/60" />
          <h2 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-tight">
            Every layer
            <br />
            <span className="font-script text-gold">tells a story.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-cream/70">
            Watch our tiramisu come together — real mascarpone, fresh espresso,
            soft ladyfingers, and a rich cocoa finish. No shortcuts, just
            patience and passion in every spoonful.
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          <div
            ref={stackRef}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl ring-1 ring-cream/10"
          >
            {LAYERS.map((layer, i) => (
              <div
                key={layer.label}
                className={`tiramisu-layer relative ${layer.color} ${layer.height} flex items-center justify-between px-5`}
              >
                <div className="layer-label">
                  <p className="text-xs font-medium uppercase tracking-wider text-chocolate/80 mix-blend-difference md:text-sm">
                    {layer.label}
                  </p>
                  <p className="text-[10px] text-chocolate/60 mix-blend-difference md:text-xs">
                    {layer.desc}
                  </p>
                </div>
                <span className="font-display text-2xl font-bold text-chocolate/10">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>

          <div className="absolute -right-4 top-1/2 hidden w-48 -translate-y-1/2 overflow-hidden rounded-xl shadow-xl ring-1 ring-cream/20 md:block lg:-right-12 lg:w-56">
            <Image
              src="/landing/layers-story.png"
              alt="Sihi tiramisu layers"
              width={224}
              height={300}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
