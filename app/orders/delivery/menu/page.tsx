import type { Metadata } from "next";
import { getProducts, getShopSettings, getStorefrontStatus } from "@/lib/data";
import { getActivePublicCoupons } from "@/lib/public-coupons";
import { StructuredData } from "@/components/seo/StructuredData";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryMenuClient } from "@/components/orders/DeliveryMenuClient";
import { readDeliveryScheduleFromCookies } from "@/lib/delivery-session-server";
import {
  buildLocalBusinessJsonLd,
  buildOffersJsonLd,
  buildProductListJsonLd,
} from "@/lib/structured-data";
import { getStorefrontDetails } from "@/lib/storefront";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site-metadata";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Delivery menu",
  description:
    "Browse Sihi Bakes desserts and bakes with prices. Order tiramisu, cakes, and treats for delivery in Mangaluru.",
  alternates: {
    canonical: `${getSiteUrl()}/orders/delivery/menu`,
  },
  openGraph: {
    title: `${BRAND.name} delivery menu`,
    description:
      "Browse desserts and bakes with prices. Order online for delivery in Mangaluru.",
    url: `${getSiteUrl()}/orders/delivery/menu`,
  },
};

export default async function DeliveryMenuPage() {
  const [{ deliveryMode, deliveryDate }, storefront, settings] = await Promise.all([
    readDeliveryScheduleFromCookies(),
    getStorefrontStatus(),
    getShopSettings(),
  ]);

  const [products, coupons] = await Promise.all([
    getProducts(false, deliveryDate ?? undefined, {
      deliveryMode: deliveryMode ?? undefined,
      // Match /api/products/menu — badge only shows for same-day remaining ≤ 5.
      includeLowStockBadge: deliveryMode === "same_day",
    }),
    getActivePublicCoupons(),
  ]);
  const store = getStorefrontDetails(settings);
  const structuredData = [
    buildLocalBusinessJsonLd(store),
    buildProductListJsonLd(products),
    buildOffersJsonLd(coupons),
  ].filter((graph): graph is Record<string, unknown> => graph !== null);

  return (
    <div className="min-h-screen bg-cream">
      <StructuredData data={structuredData} />
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
