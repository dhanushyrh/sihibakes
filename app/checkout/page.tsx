import {
  getAvailableDeliverySlots,
  getShopSettings,
  getStorefrontStatus,
} from "@/lib/data";
import { DEFAULT_KITCHEN } from "@/lib/constants";
import { getDeliveryFence } from "@/lib/delivery-fence";
import { ShopStatusBannerView } from "@/components/store/ShopStatusBanner";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  const [slots, settings, storefront] = await Promise.all([
    getAvailableDeliverySlots(),
    getShopSettings(),
    getStorefrontStatus(),
  ]);

  return (
    <>
      <ShopStatusBannerView {...storefront} />
      <CheckoutClient
      slots={slots}
      kitchenLat={settings?.kitchen_lat ?? DEFAULT_KITCHEN.lat}
      kitchenLng={settings?.kitchen_lng ?? DEFAULT_KITCHEN.lng}
      deliveryFence={getDeliveryFence(settings)}
      storeOpen={storefront.isOpen}
      storeClosedMessage={storefront.bannerMessage}
      />
    </>
  );
}
