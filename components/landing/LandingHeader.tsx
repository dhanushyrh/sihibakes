"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/constants";
import { ShoppingBag } from "lucide-react";

const NAV_LINKS = [
  { href: "#story", label: "About" },
  { href: "#why-us", label: "Why Us" },
  { href: "#products", label: "Menu" },
  { href: "#reviews", label: "Reviews" },
  { href: "#delivery", label: "Delivery" },
  { href: "#contact", label: "Contact" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-chocolate/8 bg-cream/92 py-3 shadow-sm backdrop-blur-xl"
          : "bg-cream/70 py-4 backdrop-blur-sm md:bg-transparent md:py-5"
      }`}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5 justify-self-start">
          <Image
            src="/logo.png"
            alt={BRAND.name}
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="font-script text-2xl text-chocolate">Sihi</span>
        </Link>

        <nav className="hidden items-center gap-1 justify-self-center rounded-full bg-white/60 px-2 py-1.5 ring-1 ring-chocolate/8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-1.5 text-sm text-chocolate/75 transition hover:bg-surface-warm/60 hover:text-chocolate"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Link
          href="/orders"
          className="inline-flex items-center gap-2 justify-self-end rounded-full bg-chocolate px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-chocolate-dark sm:px-5"
        >
          <ShoppingBag size={16} />
          <span className="hidden sm:inline">Order Now</span>
          <span className="sm:hidden">Order</span>
        </Link>
      </div>
    </header>
  );
}
