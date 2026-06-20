import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { OrdersHub } from "@/components/orders/OrdersHub";
import { getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";

export default async function OrdersPage() {
  const settings = await getShopSettings();
  const store = getStorefrontDetails(settings);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <OrdersHub store={store} />
    </div>
  );
}
