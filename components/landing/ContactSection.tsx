"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Phone, MapPin, ShieldCheck } from "lucide-react";
import type { StorefrontDetails } from "@/lib/storefront";
import { telHref } from "@/lib/storefront";
import { ContactForm } from "./ContactForm";

gsap.registerPlugin(ScrollTrigger);

export function ContactSection({ store }: { store: StorefrontDetails }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".contact-panel", {
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        y: 32,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  const cards = [
    store.phone && {
      key: "phone",
      href: telHref(store.phone),
      icon: Phone,
      title: "Call us",
      lines: [store.phone, store.alt_phone].filter(Boolean) as string[],
    },
    store.store_address && {
      key: "address",
      icon: MapPin,
      title: "Visit",
      lines: [store.store_address],
    },
    store.fssai_license_no && {
      key: "fssai",
      icon: ShieldCheck,
      title: "FSSAI licensed",
      lines: [store.fssai_license_no],
    },
  ].filter(Boolean) as Array<{
    key: string;
    href?: string;
    icon: typeof Phone;
    title: string;
    lines: string[];
  }>;

  return (
    <section id="contact" ref={sectionRef} className="landing-section bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-script text-3xl text-gold">Get in touch</p>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-chocolate">
            Contact us
          </h2>
          <p className="mt-3 text-sm text-chocolate/60">
            Send a message or reach us directly — we&apos;d love to hear from you
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-5 lg:gap-10">
          <div className="contact-panel lg:col-span-3">
            <ContactForm />
          </div>

          <div className="contact-panel space-y-4 lg:col-span-2">
            {cards.length > 0 ? (
              cards.map((card) => {
                const Icon = card.icon;
                const inner = (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-warm">
                      <Icon size={20} className="text-chocolate" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-chocolate">
                      {card.title}
                    </h3>
                    {card.lines.map((line) => (
                      <p key={line} className="mt-1 text-sm text-chocolate/55">
                        {line}
                      </p>
                    ))}
                  </>
                );

                const className =
                  "block rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-chocolate/6 transition hover:-translate-y-0.5";

                if (card.href) {
                  return (
                    <a key={card.key} href={card.href} className={className}>
                      {inner}
                    </a>
                  );
                }
                return (
                  <div key={card.key} className={className}>
                    {inner}
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.75rem] bg-white p-6 text-sm text-chocolate/55 shadow-[var(--shadow-card)] ring-1 ring-chocolate/6">
                Store phone and address can be configured in admin settings.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
