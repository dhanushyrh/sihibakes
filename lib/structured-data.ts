import { BRAND } from "@/lib/constants";
import { describeCoupon } from "@/lib/coupon-display";
import { formatCurrency } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";
import { getSiteUrl } from "@/lib/site-metadata";
import type { PublicCoupon } from "@/lib/public-coupons";
import { instagramHref, normalizePhone } from "@/lib/storefront";
import type { Product } from "@/lib/types";
import type { StorefrontDetails } from "@/lib/storefront";

function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function productImageUrl(imagePath: string | null): string {
  return absoluteUrl(imagePath || "/hero-tiramisu.png");
}

export function buildLocalBusinessJsonLd(
  store: StorefrontDetails
): Record<string, unknown> {
  const phone = normalizePhone(store.phone);
  const sameAs = [instagramHref()].filter(Boolean);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "@id": `${getSiteUrl()}/#business`,
    name: BRAND.name,
    description:
      "Handcrafted desserts and bakes from Sihi Bakes in Mangaluru. Order signature tiramisu, cakes, and treats for delivery.",
    url: getSiteUrl(),
    image: absoluteUrl("/hero-tiramisu.png"),
    priceRange: "₹₹",
    servesCuisine: "Desserts",
    areaServed: {
      "@type": "City",
      name: "Mangaluru",
    },
    hasMenu: absoluteUrl("/orders/delivery/menu"),
    potentialAction: {
      "@type": "OrderAction",
      target: absoluteUrl("/orders/delivery"),
    },
  };

  if (phone) {
    jsonLd.telephone = `+91${phone}`;
  }

  if (store.store_address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: store.store_address,
      addressLocality: "Mangaluru",
      addressRegion: "Karnataka",
      addressCountry: "IN",
    };
  }

  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs;
  }

  return jsonLd;
}

export function buildProductJsonLd(product: Product): Record<string, unknown> {
  const unitPrice = getUnitPrice(product);
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    price: unitPrice,
    priceCurrency: "INR",
    availability: product.is_active
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    url: absoluteUrl("/orders/delivery/menu"),
  };

  if ((product.discount_percent ?? 0) > 0) {
    offer.priceValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${getSiteUrl()}/#product-${product.id}`,
    name: product.title,
    description: product.description,
    image: productImageUrl(product.image_path),
    brand: {
      "@type": "Brand",
      name: BRAND.name,
    },
    offers: offer,
  };
}

export function buildProductListJsonLd(products: Product[]): Record<string, unknown> {
  const activeProducts = products.filter((product) => product.is_active);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${BRAND.name} menu`,
    itemListElement: activeProducts.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: buildProductJsonLd(product),
    })),
  };
}

export function buildOffersJsonLd(coupons: PublicCoupon[]): Record<string, unknown> | null {
  if (coupons.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${BRAND.name} offers`,
    itemListElement: coupons.map((coupon, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Offer",
        name: coupon.code,
        description: describeCoupon(coupon),
        priceCurrency: "INR",
        url: absoluteUrl("/orders/delivery/menu"),
        offeredBy: {
          "@type": "Organization",
          name: BRAND.name,
        },
      },
    })),
  };
}

export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${getSiteUrl()}/#website`,
    name: BRAND.name,
    url: getSiteUrl(),
    description:
      "Order handcrafted desserts and bakes from Sihi Bakes for delivery in Mangaluru.",
    publisher: {
      "@id": `${getSiteUrl()}/#business`,
    },
  };
}

export function formatCatalogPrice(product: Product): string {
  const unitPrice = getUnitPrice(product);
  if ((product.discount_percent ?? 0) > 0) {
    return `${formatCurrency(unitPrice)} (was ${formatCurrency(product.price_inr)})`;
  }
  return formatCurrency(unitPrice);
}
