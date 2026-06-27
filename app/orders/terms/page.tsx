import type { Metadata } from "next";
import { LegalDocument } from "@/components/orders/LegalDocument";
import { BRAND } from "@/lib/constants";
import { getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export const metadata: Metadata = {
  title: `Terms & Conditions — ${BRAND.name}`,
};

export default async function TermsPage() {
  const settings = await getShopSettings();
  const store = getStorefrontDetails(settings);
  return <LegalDocument slug="terms" store={store} />;
}
