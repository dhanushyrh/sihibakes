import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { OrdersHub } from "@/components/orders/OrdersHub";
import { OrdersHubModals } from "@/components/orders/OrdersHubModals";
import { StructuredData } from "@/components/seo/StructuredData";
import { StorefrontCatalogSection } from "@/components/seo/StorefrontCatalogSection";
import {
  getHubMarqueeProducts,
  getProducts,
  getPublishedReviews,
  getShopSettings,
  getStorefrontStatus,
} from "@/lib/data";
import { getActivePublicCoupons } from "@/lib/public-coupons";
import { getActiveSiteAnnouncements } from "@/lib/site-announcements";
import {
  buildLocalBusinessJsonLd,
  buildOffersJsonLd,
  buildProductListJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/structured-data";
import { getStorefrontDetails } from "@/lib/storefront";

export const revalidate = 60;

export default async function OrdersPage() {
  const [settings, products, catalogProducts, coupons, reviews, storefront, announcements] =
    await Promise.all([
      getShopSettings(),
      getHubMarqueeProducts(),
      getProducts(),
      getActivePublicCoupons(),
      getPublishedReviews(),
      getStorefrontStatus(),
      getActiveSiteAnnouncements(),
    ]);
  const store = getStorefrontDetails(settings);
  const structuredData = [
    buildWebsiteJsonLd(),
    buildLocalBusinessJsonLd(store),
    buildProductListJsonLd(catalogProducts),
    buildOffersJsonLd(coupons),
  ].filter((graph): graph is Record<string, unknown> => graph !== null);

  return (
    <div className="min-h-screen bg-cream pb-[env(safe-area-inset-bottom)]">
      <StructuredData data={structuredData} />
      <ShopStatusBanner status={storefront} />
      <OrdersHub store={store} products={products} reviews={reviews} />
      <div className="mx-auto w-full max-w-lg px-4 pb-8">
        <StorefrontCatalogSection
          store={store}
          products={catalogProducts}
          coupons={coupons}
        />
      </div>
      <OrdersHubModals announcements={announcements} />
    </div>
  );
}
