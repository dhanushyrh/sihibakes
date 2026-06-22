"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { AboutStorySection } from "./AboutStorySection";
import { WhyUsSection } from "./WhyUsSection";
import { QualitySection } from "./QualitySection";
import { ProductsSection } from "./ProductsSection";
import { ReviewsSection } from "./ReviewsSection";
import { DeliverySection } from "./DeliverySection";
import { InstagramSection } from "./InstagramSection";
import { ContactSection } from "./ContactSection";
import type { Product, CustomerReview } from "@/lib/types";
import type { StorefrontDetails } from "@/lib/storefront";

gsap.registerPlugin(ScrollTrigger);

type LandingPageProps = {
  products: Product[];
  reviews: CustomerReview[];
  store: StorefrontDetails;
};

export function LandingPage({ products, reviews, store }: LandingPageProps) {
  useEffect(() => {
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <>
      <LandingHeader />
      <main className="bg-cream">
        <HeroSection />
        <AboutStorySection />
        <WhyUsSection />
        <QualitySection />
        <ProductsSection products={products} />
        <ReviewsSection reviews={reviews} />
        <DeliverySection store={store} />
        <InstagramSection store={store} />
        <ContactSection store={store} />
      </main>
    </>
  );
}
