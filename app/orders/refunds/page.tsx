import type { Metadata } from "next";
import { LegalDocument } from "@/components/orders/LegalDocument";
import { BRAND } from "@/lib/constants";
import { getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export const metadata: Metadata = {
  title: `Cancellation & Refund Policy — ${BRAND.name}`,
};

export default async function RefundsPage() {
  const settings = await getShopSettings();
  const store = getStorefrontDetails(settings);
  return <LegalDocument slug="refunds" store={store} />;
}
