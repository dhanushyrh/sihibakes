import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { OrdersHub } from "@/components/orders/OrdersHub";
import { AnnouncementModal } from "@/components/orders/AnnouncementModal";
import {
  getHubMarqueeProducts,
  getPublishedReviews,
  getShopSettings,
  getStorefrontStatus,
} from "@/lib/data";
import { getActiveSiteAnnouncement } from "@/lib/site-announcements";
import { getStorefrontDetails } from "@/lib/storefront";

export const revalidate = 60;

export default async function OrdersPage() {
  const [settings, products, reviews, storefront, announcement] = await Promise.all([
    getShopSettings(),
    getHubMarqueeProducts(),
    getPublishedReviews(),
    getStorefrontStatus(),
    getActiveSiteAnnouncement(),
  ]);
  const store = getStorefrontDetails(settings);

  return (
    <div className="min-h-screen bg-cream pb-[env(safe-area-inset-bottom)]">
      <ShopStatusBanner status={storefront} />
      <OrdersHub store={store} products={products} reviews={reviews} />
      <AnnouncementModal announcement={announcement} />
    </div>
  );
}
