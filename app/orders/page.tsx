import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { OrdersHub } from "@/components/orders/OrdersHub";
import { getLandingProducts, getPublishedReviews, getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export default async function OrdersPage() {
  const [settings, products, reviews] = await Promise.all([
    getShopSettings(),
    getLandingProducts(),
    getPublishedReviews(),
  ]);
  const store = getStorefrontDetails(settings);

  return (
    <div className="min-h-screen bg-cream pb-[env(safe-area-inset-bottom)]">
      <ShopStatusBanner />
      <OrdersHub store={store} products={products} reviews={reviews} />
    </div>
  );
}
