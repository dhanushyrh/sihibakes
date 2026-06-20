"use client";

import { formatCurrency } from "@/lib/delivery";
import { format } from "date-fns";
import type { Product, ProductTag } from "@/lib/types";
import { getUnitPrice } from "@/lib/pricing";
import Image from "next/image";

const TAG_LABELS: Record<ProductTag, string> = {
  bestseller: "Bestseller",
  chef_special: "Chef Special",
  must_try: "Must Try",
  new: "New",
};

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  onAdd?: (product: Product) => void;
}

export function ProductCard({ product, onSelect, onAdd }: ProductCardProps) {
  const unitPrice = getUnitPrice(product);
  const hasDiscount = (product.discount_percent ?? 0) > 0;
  const soldOut = product.sold_out_today || !product.is_active;

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#4B2C20]/10 transition hover:shadow-md ${
        soldOut ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onSelect?.(product)}
        disabled={soldOut}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#F5E6D3]">
          <Image
            src={product.image_path || "/hero-tiramisu.png"}
            alt={product.title}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#4B2C20]">
                Sold out
              </span>
            </div>
          )}
          {product.low_stock && !soldOut && (
            <div className="absolute bottom-2 left-2 right-2">
              <span className="block rounded-full bg-[#4B2C20] px-2.5 py-1 text-center text-[10px] font-semibold text-white">
                Only {product.remaining_next_day} left
                {product.next_delivery_date === format(new Date(), "yyyy-MM-dd")
                  ? " today!"
                  : "!"}
              </span>
            </div>
          )}
          {product.tags.length > 0 && !soldOut && (
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {product.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#4B2C20] px-2 py-0.5 text-[10px] font-medium text-white"
                >
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-serif text-base font-semibold text-[#4B2C20]">
            {product.title}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-[#4B2C20]/60">
            {product.description}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-[#4B2C20]">
                {formatCurrency(unitPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-[#4B2C20]/40 line-through">
                  {formatCurrency(product.price_inr)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#4B2C20]/50">
              Serves {product.serves}
            </span>
          </div>
        </div>
      </button>
      {!soldOut && onAdd && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(product);
          }}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#4B2C20] text-white shadow-md transition hover:bg-[#3d2319]"
          aria-label={`Add ${product.title} to cart`}
        >
          +
        </button>
      )}
    </article>
  );
}
