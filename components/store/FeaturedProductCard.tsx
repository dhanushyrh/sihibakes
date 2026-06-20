import Link from "next/link";
import Image from "next/image";
import type { Product, ProductTag } from "@/lib/types";
import { formatCurrency } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";

const TAG_LABELS: Record<ProductTag, string> = {
  bestseller: "Bestseller",
  chef_special: "Chef Special",
  must_try: "Must Try",
  new: "New",
};

export function FeaturedProductCard({ product }: { product: Product }) {
  const unitPrice = getUnitPrice(product);
  const hasDiscount = (product.discount_percent ?? 0) > 0;

  return (
    <Link
      href="/menu"
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#4B2C20]/10 transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F5E6D3]">
        <Image
          src={product.image_path || "/hero-tiramisu.png"}
          alt={product.title}
          fill
          className="object-cover transition group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {product.tags.length > 0 && (
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
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-[#4B2C20]">
            {formatCurrency(unitPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-[#4B2C20]/40 line-through">
              {formatCurrency(product.price_inr)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
