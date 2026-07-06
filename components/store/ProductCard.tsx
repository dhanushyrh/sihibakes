"use client";

import { formatCurrency } from "@/lib/delivery";
import { format } from "date-fns";
import { Minus, Plus, Users } from "lucide-react";
import type { Product, ProductTag } from "@/lib/types";
import { getUnitPrice } from "@/lib/pricing";
import { useCart } from "@/components/store/CartProvider";
import { ProductImage } from "@/components/store/ProductImage";

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
  /** When set, uses local cart state instead of CartProvider */
  cartQuantity?: number;
  onQuantityChange?: (productId: string, quantity: number) => void;
  /** Simple multi-select for enquiries — no quantity controls */
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (product: Product) => void;
  /** Cap quantity per line (e.g. pre-order limit). */
  maxQuantityPerItem?: number;
  /** Eager-load when this card is above the fold (improves LCP). */
  priority?: boolean;
}

export function ProductCard({
  product,
  onSelect,
  onAdd,
  cartQuantity,
  onQuantityChange,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  maxQuantityPerItem,
  priority = false,
}: ProductCardProps) {
  const cart = useCart();
  const unitPrice = getUnitPrice(product);
  const hasDiscount = (product.discount_percent ?? 0) > 0;
  const soldOut = product.sold_out_today || !product.is_active;
  const compact = Boolean(onAdd || onQuantityChange || selectionMode);
  const quantity =
    onQuantityChange !== undefined
      ? (cartQuantity ?? 0)
      : (cart.items.find((item) => item.productId === product.id)?.quantity ?? 0);
  const inCart = quantity > 0;

  const handleAdd = () => {
    if (maxQuantityPerItem != null && quantity >= maxQuantityPerItem) return;
    if (onQuantityChange) onQuantityChange(product.id, 1);
    else if (onAdd) onAdd(product);
    else cart.addItem(product.id);
  };

  const changeQuantity = (next: number) => {
    const capped =
      maxQuantityPerItem != null ? Math.min(next, maxQuantityPerItem) : next;
    if (onQuantityChange) onQuantityChange(product.id, capped);
    else cart.updateQuantity(product.id, capped);
  };

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:shadow-md ${
        selected ? "ring-2 ring-chocolate" : "ring-chocolate/10"
      } ${soldOut ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        className="flex flex-1 flex-col text-left"
        onClick={() => onSelect?.(product)}
        disabled={soldOut}
      >
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-parchment">
          <ProductImage
            src={product.image_path}
            alt={product.title}
            priority={priority}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-chocolate">
                Sold out
              </span>
            </div>
          )}
          {product.low_stock && !soldOut && (
            <div className="absolute bottom-2 left-2 right-2">
              <span className="block rounded-full bg-chocolate px-2.5 py-1 text-center text-[10px] font-semibold text-cream">
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
                  className="rounded-full bg-chocolate/90 px-2 py-0.5 text-[10px] font-medium text-cream backdrop-blur-sm"
                >
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3">
          <h3 className="font-display text-[15px] font-semibold leading-snug text-chocolate">
            {product.title}
          </h3>

          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-chocolate/45">
            <Users size={11} strokeWidth={2} className="shrink-0" />
            <span>Serves {product.serves}</span>
          </div>

          {!compact && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-chocolate/55">
              {product.description}
            </p>
          )}

          <div className={`flex items-baseline gap-1.5 ${compact ? "mt-3" : "mt-auto pt-3"}`}>
            <span className="text-sm font-semibold text-chocolate">
              {formatCurrency(unitPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-chocolate/40 line-through">
                {formatCurrency(product.price_inr)}
              </span>
            )}
          </div>
        </div>
      </button>

      {!soldOut && selectionMode && (
        <div className="border-t border-chocolate/5 px-3 py-2.5">
          <button
            type="button"
            onClick={() => onToggleSelect?.(product)}
            className={`flex w-full items-center justify-center rounded-full py-2 text-xs font-medium transition active:scale-[0.98] ${
              selected
                ? "bg-cream text-chocolate ring-1 ring-chocolate/20"
                : "bg-chocolate text-cream hover:bg-chocolate-dark"
            }`}
            aria-label={selected ? `Deselect ${product.title}` : `Select ${product.title}`}
          >
            {selected ? "Selected" : "Select"}
          </button>
        </div>
      )}

      {!soldOut && !selectionMode && compact && (
        <div className="border-t border-chocolate/5 px-3 py-2.5">
          {inCart ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeQuantity(quantity - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-cream text-chocolate transition active:scale-95"
                  aria-label={`Decrease ${product.title} quantity`}
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <span className="min-w-[1.25rem] text-center text-sm font-semibold text-chocolate">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => changeQuantity(quantity + 1)}
                  disabled={
                    maxQuantityPerItem != null && quantity >= maxQuantityPerItem
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-chocolate text-cream transition active:scale-95 disabled:opacity-40"
                  aria-label={`Increase ${product.title} quantity`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-chocolate py-2 text-xs font-medium text-cream transition hover:bg-chocolate-dark active:scale-[0.98]"
              aria-label={`Add ${product.title} to cart`}
            >
              <Plus size={14} strokeWidth={2.5} />
              Add to cart
            </button>
          )}
        </div>
      )}
    </article>
  );
}
