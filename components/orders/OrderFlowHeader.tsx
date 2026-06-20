"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/store/CartProvider";

export function OrderFlowHeader({
  title,
  backHref,
  showCart = false,
  cartHref = "/orders/delivery/cart",
}: {
  title: string;
  backHref?: string;
  showCart?: boolean;
  cartHref?: string;
}) {
  const router = useRouter();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-chocolate/10 bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        {backHref ? (
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-full text-chocolate transition hover:bg-chocolate/5"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-chocolate transition hover:bg-chocolate/5"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="flex-1 truncate text-center font-display text-lg font-semibold text-chocolate">
          {title}
        </h1>
        {showCart ? (
          <Link
            href={cartHref}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-chocolate transition hover:bg-chocolate/5"
            aria-label="View cart"
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-chocolate px-1 text-[10px] font-bold text-cream">
                {itemCount}
              </span>
            )}
          </Link>
        ) : (
          <span className="h-9 w-9" />
        )}
      </div>
    </header>
  );
}
