import { getProducts } from "@/lib/data";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryMenuClient } from "@/components/orders/DeliveryMenuClient";

export default async function DeliveryMenuPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <DeliveryMenuClient products={products} />
    </div>
  );
}
