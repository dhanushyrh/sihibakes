import { getStorefrontStatus, getShopSettings } from "@/lib/data";
import { toStoreContact, getStorefrontDetails } from "@/lib/storefront";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import CartClient from "./CartClient";

export default async function CartPage() {
  const storefront = await getStorefrontStatus();
  const settings = await getShopSettings();
  const contact = toStoreContact(getStorefrontDetails(settings));

  return (
    <>
      <ShopStatusBanner />
      <CartClient
        storeOpen={storefront.isOpen}
        storeClosedMessage={storefront.bannerMessage}
        contact={contact}
      />
    </>
  );
}
