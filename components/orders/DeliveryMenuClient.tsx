"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductDetailModal } from "@/components/store/ProductDetailModal";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { useCart } from "@/components/store/CartProvider";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import type { Product, ProductTag } from "@/lib/types";
import { TAG_OPTIONS } from "@/lib/constants";

export function DeliveryMenuClient({ products: initialProducts }: { products: Product[] }) {
  const router = useRouter();
  const { isLocationReady } = useDeliverySession();
  const { addItem } = useCart();
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<Product | null>(null);
  const [tagFilter, setTagFilter] = useState<ProductTag | "all">("all");

  useEffect(() => {
    if (!isLocationReady) {
      router.replace("/orders/delivery");
    }
  }, [isLocationReady, router]);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (tagFilter !== "all" && !p.tags.includes(tagFilter)) return false;
      return p.is_active;
    });
  }, [products, tagFilter]);

  if (!isLocationReady) return null;

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <OrderFlowHeader
        title="Choose desserts"
        backHref="/orders/delivery"
        showCart
      />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">
        <p className="text-sm text-chocolate/60">
          Add items to your cart, then review and place your order.
        </p>

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
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={setSelected}
                onAdd={(p) => addItem(p.id)}
              />
            ))}
          </div>
        )}

        <Link
          href="/orders/delivery/cart"
          className="fixed bottom-4 left-4 right-4 z-30 mx-auto block max-w-lg rounded-full bg-chocolate py-4 text-center text-sm font-medium text-cream shadow-lg md:hidden"
        >
          View cart
        </Link>
      </main>

      <ProductDetailModal
        product={selected}
        onClose={() => setSelected(null)}
        onAdd={(p) => addItem(p.id)}
      />
    </div>
  );
}
