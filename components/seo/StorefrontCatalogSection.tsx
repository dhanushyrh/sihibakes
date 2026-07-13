import Link from "next/link";
import { describeCoupon } from "@/lib/coupon-display";
import { BRAND } from "@/lib/constants";
import { formatCatalogPrice } from "@/lib/structured-data";
import {
  formatDisplayPhone,
  instagramHref,
  telHref,
  whatsappHref,
} from "@/lib/storefront";
import type { PublicCoupon } from "@/lib/public-coupons";
import type { Product } from "@/lib/types";
import type { StorefrontDetails } from "@/lib/storefront";

type StorefrontCatalogSectionProps = {
  store: StorefrontDetails;
  products: Product[];
  coupons: PublicCoupon[];
};

export function StorefrontCatalogSection({
  store,
  products,
  coupons,
}: StorefrontCatalogSectionProps) {
  const activeProducts = products.filter((product) => product.is_active);
  if (activeProducts.length === 0) return null;

  return (
    <section
      id="menu"
      aria-label="Sihi Bakes menu and business information"
      className="mt-10 rounded-2xl bg-white px-4 py-5 ring-1 ring-chocolate/10"
    >
      <div className="space-y-1 text-center">
        <h2 className="font-display text-xl font-semibold text-chocolate">
          {BRAND.name} — {BRAND.tagline}
        </h2>
        <p className="text-sm leading-relaxed text-chocolate/65">
          Handcrafted desserts and bakes in Mangaluru. Order online for delivery
          to your doorstep.
        </p>
      </div>

      <nav
        className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm"
        aria-label="Site links"
      >
        <Link href="/orders/delivery" className="font-medium text-chocolate underline">
          Order delivery
        </Link>
        <Link
          href="/orders/delivery/menu"
          className="font-medium text-chocolate underline"
        >
          View full menu
        </Link>
        <a
          href={instagramHref()}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-chocolate underline"
        >
          Instagram
        </a>
        <a
          href={whatsappHref(store.phone, "Hi Sihi Bakes! I'd like to place an order.")}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-chocolate underline"
        >
          WhatsApp
        </a>
      </nav>

      {(store.store_address || store.phone) && (
        <div className="mt-4 text-center text-sm text-chocolate/65">
          {store.store_address && <p>{store.store_address}</p>}
          {store.phone && (
            <p className="mt-1">
              Phone:{" "}
              <a href={telHref(store.phone)} className="font-medium text-chocolate underline">
                {formatDisplayPhone(store.phone)}
              </a>
            </p>
          )}
          {store.fssai_license_no && (
            <p className="mt-1">FSSAI: {store.fssai_license_no}</p>
          )}
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-display text-lg font-semibold text-chocolate">Our menu</h3>
        <ul className="mt-3 space-y-3">
          {activeProducts.map((product) => (
            <li
              key={product.id}
              className="rounded-xl bg-parchment/40 px-3.5 py-3 ring-1 ring-chocolate/8"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-chocolate">
                    {product.title}
                  </p>
                  {product.description && (
                    <p className="mt-1 text-sm leading-relaxed text-chocolate/65">
                      {product.description}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-semibold text-chocolate">
                  {formatCatalogPrice(product)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {coupons.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-lg font-semibold text-chocolate">
            Current offers
          </h3>
          <ul className="mt-3 space-y-2">
            {coupons.map((coupon) => (
              <li
                key={coupon.code}
                className="rounded-xl bg-gold/10 px-3.5 py-2.5 text-sm text-chocolate/75 ring-1 ring-gold/25"
              >
                <span className="font-semibold text-chocolate">{coupon.code}</span>
                {" — "}
                {describeCoupon(coupon)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
