import { StoreFooter } from "@/components/store/StoreFooter";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingProducts, getShopSettings } from "@/lib/data";
import { getStorefrontDetails, toStoreContact } from "@/lib/storefront";

export default async function HomePage() {
  const [products, settings] = await Promise.all([
    getLandingProducts(),
    getShopSettings(),
  ]);

  const store = getStorefrontDetails(settings);
  const contact = toStoreContact(store);

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <ShopStatusBanner />
      <LandingPage products={products} store={store} />
      <StoreFooter contact={contact} />
    </div>
  );
}
