import { Suspense } from "react";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { EnquiryClient } from "@/components/orders/EnquiryClient";
import { getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export default async function EnquiryPage() {
  const settings = await getShopSettings();
  const store = getStorefrontDetails(settings);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <Suspense>
        <EnquiryClient store={store} />
      </Suspense>
    </div>
  );
}
