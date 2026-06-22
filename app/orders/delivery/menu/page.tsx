import { getProducts } from "@/lib/data";
import { getActivePublicCoupons } from "@/lib/public-coupons";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryMenuClient } from "@/components/orders/DeliveryMenuClient";

export default async function DeliveryMenuPage() {
  const [products, coupons] = await Promise.all([
    getProducts(),
    getActivePublicCoupons(),
  ]);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <DeliveryMenuClient products={products} coupons={coupons} />
    </div>
  );
}
