import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { OrdersLegalFooter } from "@/components/orders/OrdersLegalFooter";
import {
  buildLegalContext,
  getLegalPage,
  type LegalPageSlug,
} from "@/lib/legal-pages";
import type { StorefrontDetails } from "@/lib/storefront";

export function LegalDocument({
  slug,
  store,
}: {
  slug: LegalPageSlug;
  store: StorefrontDetails;
}) {
  const page = getLegalPage(slug, store);
  const ctx = buildLegalContext(store);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <OrderFlowHeader title={page.title} backHref="/orders" />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-[env(safe-area-inset-bottom)]">
        <p className="text-xs text-chocolate/45">Last updated: {ctx.lastUpdated}</p>
        <div className="mt-6 space-y-6">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-base font-semibold text-chocolate">
                {section.heading}
              </h2>
              <div className="mt-2 space-y-2">
                {section.paragraphs.map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-chocolate/70"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <OrdersLegalFooter store={store} showBackLink />
      </main>
    </div>
  );
}
