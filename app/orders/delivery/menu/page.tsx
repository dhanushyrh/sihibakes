import { getProducts, getStorefrontStatus } from "@/lib/data";
import { getActivePublicCoupons } from "@/lib/public-coupons";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryMenuClient } from "@/components/orders/DeliveryMenuClient";
import { readDeliveryScheduleFromCookies } from "@/lib/delivery-session-server";

export const revalidate = 60;

export default async function DeliveryMenuPage() {
  const [{ deliveryMode, deliveryDate }, storefront] = await Promise.all([
    readDeliveryScheduleFromCookies(),
    getStorefrontStatus(),
  ]);

  const [products, coupons] = await Promise.all([
    getProducts(false, deliveryDate ?? undefined, {
      deliveryMode: deliveryMode ?? undefined,
    }),
    getActivePublicCoupons(),
  ]);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner status={storefront} />
      <DeliveryMenuClient
        products={products}
        coupons={coupons}
        ssrDeliveryMode={deliveryMode}
        ssrDeliveryDate={deliveryDate}
      />
    </div>
  );
}
