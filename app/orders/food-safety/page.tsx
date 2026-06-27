import type { Metadata } from "next";
import { LegalDocument } from "@/components/orders/LegalDocument";
import { BRAND } from "@/lib/constants";
import { getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export const metadata: Metadata = {
  title: `Allergen & Food Safety — ${BRAND.name}`,
};

export default async function FoodSafetyPage() {
  const settings = await getShopSettings();
  const store = getStorefrontDetails(settings);
  return <LegalDocument slug="food-safety" store={store} />;
}
