import { Suspense } from "react";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { EnquiryClient } from "@/components/orders/EnquiryClient";
import { getProducts, getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export default async function EnquiryPage() {
  const [settings, products] = await Promise.all([
    getShopSettings(),
    getProducts(),
  ]);
  const store = getStorefrontDetails(settings);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <Suspense>
        <EnquiryClient store={store} products={products} />
      </Suspense>
    </div>
  );
}
