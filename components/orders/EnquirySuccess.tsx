import { CheckCircle } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { telHref } from "@/lib/storefront";
import type { StorefrontDetails } from "@/lib/storefront";

export function EnquirySuccess({
  store,
  title = "Enquiry sent",
}: {
  store: StorefrontDetails;
  title?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <OrderFlowHeader title={title} backHref="/orders" />
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <CheckCircle size={48} className="text-gold" />
        <h2 className="mt-4 font-display text-2xl font-semibold text-chocolate">
          Thank you!
        </h2>
        <p className="mt-2 text-sm text-chocolate/60">
          We&apos;ve received your enquiry and will get back to you within 24 hours.
        </p>
        {store.phone && (
          <a
            href={telHref(store.phone)}
            className="mt-6 text-sm font-medium text-chocolate underline"
          >
            Or call {store.phone}
          </a>
        )}
      </main>
    </div>
  );
}
