import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { LEGAL_PAGES } from "@/lib/legal-pages";
import type { StorefrontDetails } from "@/lib/storefront";

export function OrdersLegalFooter({
  store,
  showBackLink = false,
}: {
  store: StorefrontDetails;
  showBackLink?: boolean;
}) {
  return (
    <footer className="-mx-4 mt-12 bg-chocolate px-4 py-8 text-center text-cream">
      <p className="font-display text-sm font-semibold text-cream">
        {BRAND.name}
      </p>
      {store.store_address && (
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-cream/70">
          {store.store_address}
        </p>
      )}
      {store.fssai_license_no && (
        <p className="mt-1 text-xs text-cream/70">
          FSSAI: {store.fssai_license_no}
        </p>
      )}
      <nav
        className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-cream/60"
        aria-label="Legal policies"
      >
        {LEGAL_PAGES.map((page, index) => (
          <span key={page.slug} className="inline-flex items-center gap-3">
            {index > 0 && (
              <span className="text-cream/30" aria-hidden>
                ·
              </span>
            )}
            <Link href={page.href} className="hover:text-cream hover:underline">
              {page.shortLabel}
            </Link>
          </span>
        ))}
      </nav>
      {showBackLink && (
        <p className="mt-4">
          <Link
            href="/orders"
            className="text-xs text-cream/60 hover:text-cream hover:underline"
          >
            Back to orders
          </Link>
        </p>
      )}
    </footer>
  );
}
