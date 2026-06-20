"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { useCart } from "@/components/store/CartProvider";
import { formatCurrency } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import type { StoreContactDetails } from "@/components/store/StoreFooter";

interface CartClientProps {
  storeOpen: boolean;
  storeClosedMessage: string | null;
  contact?: StoreContactDetails;
}

export default function CartClient({
  storeOpen,
  storeClosedMessage,
  contact,
}: CartClientProps) {
  const { items, updateQuantity, removeItem, itemCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = items.map((i) => i.productId);
    if (!ids.length) {
      setProducts([]);
      setLoading(false);
      return;
    }
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [items]);

  const cartLines = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const unitPrice = getUnitPrice(product);
        return { ...item, product, unitPrice, lineTotal: unitPrice * item.quantity };
      })
      .filter(Boolean) as {
      productId: string;
      quantity: number;
      product: Product;
      unitPrice: number;
      lineTotal: number;
    }[];
  }, [items, products]);

  const subtotal = cartLines.reduce((s, l) => s + l.lineTotal, 0);

  return (
    <div className="flex min-h-screen flex-col pb-24 md:pb-0">
      <StoreHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">Your Cart</h1>

        {!storeOpen && storeClosedMessage && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            {storeClosedMessage}
          </p>
        )}

        {loading && itemCount > 0 ? (
          <p className="mt-8 text-center text-sm text-[#4B2C20]/50">Loading...</p>
        ) : itemCount === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-sm text-[#4B2C20]/60">Your cart is empty</p>
            <Link
              href="/menu"
              className="mt-4 inline-block rounded-full bg-[#4B2C20] px-6 py-2.5 text-sm text-white"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              {cartLines.map((line) => (
                <div
                  key={line.productId}
                  className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#4B2C20]/10"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                    <Image
                      src={line.product.image_path || "/hero-tiramisu.png"}
                      alt={line.product.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-medium text-[#4B2C20]">
                        {line.product.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeItem(line.productId)}
                        className="text-[#4B2C20]/30 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-[#4B2C20]/50">
                      {formatCurrency(line.unitPrice)} each
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(line.productId, line.quantity - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5E6D3]"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-medium">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(line.productId, line.quantity + 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5E6D3]"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(line.lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-[#4B2C20]/10">
              <div className="flex justify-between text-sm">
                <span className="text-[#4B2C20]/60">Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-[#4B2C20]/40">
                Delivery fee calculated at checkout
              </p>
            </div>

            {storeOpen ? (
              <Link
                href="/checkout"
                className="mt-4 block w-full rounded-full bg-[#4B2C20] py-3.5 text-center text-sm font-medium text-white"
              >
                Proceed to Checkout
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-4 block w-full cursor-not-allowed rounded-full bg-[#4B2C20]/30 py-3.5 text-center text-sm font-medium text-white"
              >
                Checkout unavailable
              </button>
            )}
          </>
        )}
      </main>
      <StoreFooter contact={contact} />
    </div>
  );
}
