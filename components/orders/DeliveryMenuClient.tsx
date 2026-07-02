"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductDetailModal } from "@/components/store/ProductDetailModal";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { useCart } from "@/components/store/CartProvider";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import { isMenuProduct } from "@/lib/cart-products";
import { formatDeliveryModeSummary } from "@/lib/delivery-mode-availability";
import { getMaxQuantityPerItem } from "@/lib/inventory";
import type { Product, ProductTag } from "@/lib/types";
import { TAG_OPTIONS } from "@/lib/constants";
import type { PublicCoupon } from "@/lib/public-coupons";
import { MenuCouponsShowcase } from "@/components/orders/MenuCouponsShowcase";
import { OrderFlowLoading } from "@/components/store/OrderFlowLoading";
import { Spinner } from "@/components/ui/Spinner";

export function DeliveryMenuClient({
  products: initialProducts,
  coupons,
}: {
  products: Product[];
  coupons: PublicCoupon[];
}) {
  const router = useRouter();
  const { session, sessionReady, isDeliveryModeReady } = useDeliverySession();
  const { addItem, itemCount, items, pruneItems } = useCart();
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<Product | null>(null);
  const [tagFilter, setTagFilter] = useState<ProductTag | "all">("all");
  const [unavailableNotice, setUnavailableNotice] = useState("");
  const [refetching, setRefetching] = useState(false);

  useEffect(() => {
    if (!sessionReady) return;
    if (!isDeliveryModeReady) {
      router.replace("/orders/delivery");
    }
  }, [sessionReady, isDeliveryModeReady, router]);

  useEffect(() => {
    if (!sessionReady || !session.deliveryDate || !session.deliveryMode) return;

    setRefetching(true);
    const params = new URLSearchParams({
      delivery_date: session.deliveryDate,
      delivery_mode: session.deliveryMode,
    });
    fetch(`/api/products/menu?${params.toString()}`)
      .then((r) => r.json())
      .then((data: Product[]) => {
        setProducts(data);
        const validIds = new Set(data.filter(isMenuProduct).map((p) => p.id));
        const removedCount = items.filter((i) => !validIds.has(i.productId)).length;
        pruneItems([...validIds]);
        if (removedCount > 0) {
          setUnavailableNotice(
            "Some items in your cart are unavailable for this delivery date and were removed."
          );
        }
      })
      .catch(() => setProducts(initialProducts))
      .finally(() => setRefetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when delivery schedule changes
  }, [sessionReady, session.deliveryDate, session.deliveryMode, items, pruneItems]);

  useEffect(() => {
    if (products.length === 0) return;
    pruneItems(products.filter(isMenuProduct).map((p) => p.id));
  }, [products, pruneItems]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!isMenuProduct(p)) return false;
      if (tagFilter !== "all" && !p.tags.includes(tagFilter)) return false;
      return p.is_active;
    });
  }, [products, tagFilter]);

  const scheduleSummary =
    session.deliveryMode && session.deliveryDate
      ? formatDeliveryModeSummary(session.deliveryMode, session.deliveryDate)
      : null;

  const maxQuantityPerItem = getMaxQuantityPerItem(session.deliveryMode);

  const addToCart = (productId: string) => {
    const existing = items.find((item) => item.productId === productId)?.quantity ?? 0;
    if (maxQuantityPerItem != null && existing >= maxQuantityPerItem) return;
    addItem(productId);
  };

  if (!sessionReady || !isDeliveryModeReady) {
    return <OrderFlowLoading />;
  }

  return (
    <div className="flex min-h-screen flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <OrderFlowHeader
        title="Choose desserts"
        backHref="/orders/delivery"
        showCart
      />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">
        {scheduleSummary && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-chocolate/10">
            <p className="text-sm font-medium text-chocolate">{scheduleSummary}</p>
            <Link
              href="/orders/delivery"
              className="shrink-0 text-xs font-medium text-chocolate/60 underline"
            >
              Edit
            </Link>
          </div>
        )}

        {unavailableNotice && (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            {unavailableNotice}
          </p>
        )}

        {refetching && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 ring-1 ring-chocolate/10">
            <Spinner size="sm" label="Updating menu" />
            <span className="text-xs text-chocolate/50">Updating menu…</span>
          </div>
        )}

        <MenuCouponsShowcase coupons={coupons} />

        {session.deliveryMode === "pre_order" && (
          <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs text-chocolate/60 ring-1 ring-chocolate/10">
            Pre-order limit: up to {maxQuantityPerItem} of each item per order.
          </p>
        )}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setTagFilter("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              tagFilter === "all"
                ? "bg-chocolate text-cream"
                : "bg-white text-chocolate ring-1 ring-chocolate/10"
            }`}
          >
            All
          </button>
          {TAG_OPTIONS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTagFilter(t.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                tagFilter === t.key
                  ? "bg-chocolate text-cream"
                  : "bg-white text-chocolate ring-1 ring-chocolate/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="mt-12 text-center text-sm text-chocolate/50">
            No products available right now.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4">
            {filtered.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={setSelected}
                onAdd={(p) => addToCart(p.id)}
                maxQuantityPerItem={maxQuantityPerItem}
                priority={index < 2}
              />
            ))}
          </div>
        )}
      </main>

      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-chocolate/10 bg-cream/95 backdrop-blur-md">
          <div className="mx-auto max-w-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <Link
              href="/orders/delivery/cart"
              className="block w-full rounded-full bg-chocolate py-3.5 text-center text-sm font-medium text-cream shadow-lg"
            >
              View cart · {itemCount} {itemCount === 1 ? "item" : "items"}
            </Link>
          </div>
        </div>
      )}

      <ProductDetailModal
        product={selected}
        onClose={() => setSelected(null)}
        onAdd={(p) => addToCart(p.id)}
        maxQuantityPerItem={maxQuantityPerItem}
      />
    </div>
  );
}
