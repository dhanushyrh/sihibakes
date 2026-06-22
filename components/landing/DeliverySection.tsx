"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MapPin, Clock, Package, ArrowRight, ExternalLink } from "lucide-react";
import type { StorefrontDetails } from "@/lib/storefront";
import { getDeliveryAreaLabel, googleMapsUrl } from "@/lib/storefront";
import { formatDeliveryFenceShort } from "@/lib/delivery-fence";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { icon: Package, title: "Choose desserts", desc: "Browse the menu and add to cart" },
  { icon: MapPin, title: "Pin at checkout", desc: "Drop your location when you checkout" },
  { icon: Clock, title: "Pick a slot & pay", desc: "Choose delivery time and place your order" },
];

export function DeliverySection({ store }: { store: StorefrontDetails }) {
  const sectionRef = useRef<HTMLElement>(null);
  const areaLabel = getDeliveryAreaLabel(store.store_address);
  const mapsUrl = googleMapsUrl(store.kitchen_lat, store.kitchen_lng);

  useGSAP(
    () => {
      gsap.from(".delivery-card", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 72%" },
        y: 36,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section id="delivery" ref={sectionRef} className="landing-section bg-cream">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="delivery-card overflow-hidden rounded-[2.25rem] bg-chocolate text-cream shadow-[var(--shadow-soft)] md:rounded-[2.75rem]">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 md:p-10 lg:p-12">
              <p className="font-script text-3xl text-gold-light">Delivery</p>
              <h2 className="mt-2 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-tight">
                Sweet moments,
                <br />
                at your doorstep
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/75 md:text-base">
                We deliver within{" "}
                {formatDeliveryFenceShort(store.delivery_fence)} of our kitchen
                with temperature-conscious packaging.
                {store.store_address && (
                  <span className="mt-2 block text-cream/55">
                    Kitchen: {store.store_address}
                  </span>
                )}
              </p>

              <div className="mt-8 space-y-4">
                {STEPS.map((step, i) => (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream/10">
                      <step.icon size={18} className="text-gold-light" />
                    </div>
                    <div>
                      <p className="text-xs text-cream/45">Step {i + 1}</p>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm text-cream/60">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/orders/delivery/menu"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3.5 text-sm font-medium text-chocolate transition hover:bg-white"
              >
                Start delivery order
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="flex flex-col justify-center bg-chocolate-dark/40 p-8 md:p-10">
              <div className="rounded-[1.75rem] bg-cream/10 p-8 text-center ring-1 ring-cream/15">
                <MapPin size={40} className="mx-auto text-gold-light" strokeWidth={1.5} />
                <p className="mt-4 font-display text-2xl">{areaLabel}</p>
                <p className="mt-2 text-sm text-cream/55">
                  {formatDeliveryFenceShort(store.delivery_fence)} from kitchen
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-gold-light hover:underline"
                >
                  View kitchen on map
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
