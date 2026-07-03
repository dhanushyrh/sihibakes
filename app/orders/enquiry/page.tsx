import { Suspense } from "react";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { EnquiryClient } from "@/components/orders/EnquiryClient";
import { getProducts, getShopSettings, getStorefrontStatus } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export default async function EnquiryPage() {
  const [settings, products, storefront] = await Promise.all([
    getShopSettings(),
    getProducts(),
    getStorefrontStatus(),
  ]);
  const store = getStorefrontDetails(settings);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner status={storefront} />
      <Suspense>
        <EnquiryClient store={store} products={products} />
      </Suspense>
    </div>
  );
}
