"use client";

import type { Product } from "@/lib/types";
import { ALLERGEN_OPTIONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";
import Image from "next/image";
import { X } from "lucide-react";

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
  if (!product) return null;

  const unitPrice = getUnitPrice(product);
  const soldOut = product.sold_out_today || !product.is_active;
  const activeAllergens = ALLERGEN_OPTIONS.filter(
    (a) => product.allergens[a.key]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#F5E6D3] sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#4B2C20]"
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
          <h2 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            {product.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#4B2C20]/70">
            {product.description}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xl font-semibold text-[#4B2C20]">
              {formatCurrency(unitPrice)}
            </span>
            <span className="text-sm text-[#4B2C20]/50">
              Serves {product.serves}
            </span>
          </div>
          {product.low_stock && !soldOut && (
            <p className="mt-2 rounded-full bg-[#4B2C20] px-3 py-1.5 text-center text-xs font-semibold text-white">
              Hurry! Only {product.remaining_next_day} left
              {product.next_delivery_date === new Date().toISOString().slice(0, 10)
                ? " for today"
                : " for delivery"}
            </p>
          )}
          {activeAllergens.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#4B2C20]/50">
                Contains
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {activeAllergens.map((a) => (
                  <span
                    key={a.key}
                    className="rounded-full border border-[#4B2C20]/20 bg-white px-2.5 py-0.5 text-xs text-[#4B2C20]"
                  >
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={soldOut}
            onClick={() => {
              onAdd(product);
              onClose();
            }}
            className="mt-6 w-full rounded-full bg-[#4B2C20] py-3.5 text-sm font-medium text-white transition hover:bg-[#3d2319] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
