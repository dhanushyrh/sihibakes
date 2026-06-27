import type { Metadata } from "next";
import { LegalDocument } from "@/components/orders/LegalDocument";
import { BRAND } from "@/lib/constants";
import { getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export const metadata: Metadata = {
  title: `Delivery Policy — ${BRAND.name}`,
};

export default async function DeliveryPolicyPage() {
  const settings = await getShopSettings();
  const store = getStorefrontDetails(settings);
  return <LegalDocument slug="delivery-policy" store={store} />;
}
