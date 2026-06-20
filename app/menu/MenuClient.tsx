"use client";

import { useEffect, useMemo, useState } from "react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductDetailModal } from "@/components/store/ProductDetailModal";
import { useCart } from "@/components/store/CartProvider";
import type { Product, ProductTag } from "@/lib/types";
import type { StoreContactDetails } from "@/components/store/StoreFooter";
import { TAG_OPTIONS } from "@/lib/constants";

interface MenuPageProps {
  products: Product[];
  contact?: StoreContactDetails;
}

export default function MenuPage({ products: initialProducts, contact }: MenuPageProps) {
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<Product | null>(null);
  const [tagFilter, setTagFilter] = useState<ProductTag | "all">("all");
  const [allergenFree, setAllergenFree] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (tagFilter !== "all" && !p.tags.includes(tagFilter)) return false;
      if (allergenFree && p.allergens[allergenFree as keyof typeof p.allergens])
        return false;
      return true;
    });
  }, [products, tagFilter, allergenFree]);

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <StoreHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">Menu</h1>
        <p className="mt-1 text-sm text-[#4B2C20]/60">
          Fresh desserts, made to order
        </p>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setTagFilter("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tagFilter === "all"
                ? "bg-[#4B2C20] text-white"
                : "bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
            }`}
          >
            All
          </button>
          {TAG_OPTIONS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTagFilter(t.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                tagFilter === t.key
                  ? "bg-[#4B2C20] text-white"
                  : "bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setAllergenFree(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium ${
              !allergenFree ? "bg-[#4B2C20]/10 text-[#4B2C20]" : "text-[#4B2C20]/50"
            }`}
          >
            All allergens
          </button>
          {["egg", "dairy", "gluten", "nuts"].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAllergenFree(allergenFree === a ? null : a)}
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium capitalize ${
                allergenFree === a
                  ? "bg-[#4B2C20]/10 text-[#4B2C20]"
                  : "text-[#4B2C20]/50"
              }`}
            >
              No {a}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="mt-12 text-center text-sm text-[#4B2C20]/50">
            No products match your filters.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
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
      </main>
      <StoreFooter contact={contact} />
      <ProductDetailModal
        product={selected}
        onClose={() => setSelected(null)}
        onAdd={(p) => addItem(p.id)}
      />
    </div>
  );
}
