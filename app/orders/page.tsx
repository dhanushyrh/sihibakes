import { Suspense } from "react";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { OrdersHub } from "@/components/orders/OrdersHub";
import {
  getHubMarqueeProducts,
  getPublishedReviews,
  getShopSettings,
} from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export const revalidate = 60;

export default async function OrdersPage() {
  const [settings, products, reviews] = await Promise.all([
    getShopSettings(),
    getHubMarqueeProducts(),
    getPublishedReviews(),
  ]);
  const store = getStorefrontDetails(settings);

  return (
    <div className="min-h-screen bg-cream pb-[env(safe-area-inset-bottom)]">
      <Suspense fallback={null}>
        <ShopStatusBanner />
      </Suspense>
      <OrdersHub store={store} products={products} reviews={reviews} />
    </div>
  );
}
