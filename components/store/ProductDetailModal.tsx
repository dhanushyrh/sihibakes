"use client";

import type { Product } from "@/lib/types";
import { ALLERGEN_OPTIONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";
import { useCart } from "@/components/store/CartProvider";
import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product) => void;
}

export function ProductDetailModal({
  product,
  onClose,
  onAdd,
}: ProductDetailModalProps) {
  const { items, updateQuantity } = useCart();

  if (!product) return null;

  const unitPrice = getUnitPrice(product);
  const soldOut = product.sold_out_today || !product.is_active;
  const quantity =
    items.find((item) => item.productId === product.id)?.quantity ?? 0;
  const inCart = quantity > 0;
  const activeAllergens = ALLERGEN_OPTIONS.filter(
    (a) => product.allergens[a.key]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-chocolate"
        >
          <X size={18} />
        </button>
        <div className="relative aspect-square">
          <Image
            src={product.image_path || "/hero-tiramisu.png"}
            alt={product.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-5">
          <h2 className="font-display text-2xl font-semibold text-chocolate">
            {product.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-chocolate/70">
            {product.description}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xl font-semibold text-chocolate">
              {formatCurrency(unitPrice)}
            </span>
            <span className="text-sm text-chocolate/50">
              Serves {product.serves}
            </span>
          </div>
          {product.low_stock && !soldOut && (
            <p className="mt-2 rounded-full bg-chocolate px-3 py-1.5 text-center text-xs font-semibold text-cream">
              Hurry! Only {product.remaining_next_day} left
              {product.next_delivery_date === new Date().toISOString().slice(0, 10)
                ? " for today"
                : " for delivery"}
            </p>
          )}
          {activeAllergens.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-chocolate/50">
                Contains
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {activeAllergens.map((a) => (
                  <span
                    key={a.key}
                    className="rounded-full border border-chocolate/20 bg-white px-2.5 py-0.5 text-xs text-chocolate"
                  >
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {soldOut ? (
            <button
              type="button"
              disabled
              className="mt-6 w-full rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream opacity-50"
            >
              Sold out
            </button>
          ) : inCart ? (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-chocolate ring-1 ring-chocolate/10"
              >
                <Minus size={18} />
              </button>
              <span className="min-w-[2rem] text-center text-lg font-semibold text-chocolate">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(product.id, quantity + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-chocolate text-cream"
              >
                <Plus size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onAdd(product);
                onClose();
              }}
              className="mt-6 w-full rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream transition hover:bg-chocolate-dark"
            >
              Add to cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
