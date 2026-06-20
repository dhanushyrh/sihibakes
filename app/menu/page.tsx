import { getProducts, getShopSettings } from "@/lib/data";
import { toStoreContact, getStorefrontDetails } from "@/lib/storefront";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import MenuClient from "./MenuClient";

export default async function MenuPage() {
  const [products, settings] = await Promise.all([
    getProducts(),
    getShopSettings(),
  ]);
  const contact = toStoreContact(getStorefrontDetails(settings));
  return (
    <>
      <ShopStatusBanner />
      <MenuClient products={products} contact={contact} />
    </>
  );
}
