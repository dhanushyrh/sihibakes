import type { Metadata } from "next";
import { LegalDocument } from "@/components/orders/LegalDocument";
import { BRAND } from "@/lib/constants";
import { getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND.name}`,
};

export default async function PrivacyPage() {
  const settings = await getShopSettings();
  const store = getStorefrontDetails(settings);
  return <LegalDocument slug="privacy" store={store} />;
}
