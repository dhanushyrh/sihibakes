"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { useCart } from "@/components/store/CartProvider";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import { formatCurrency } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";
import type { Product } from "@/lib/types";

import {
  readAppliedCoupon,
  writeAppliedCoupon,
  type AppliedCoupon,
} from "@/lib/applied-coupon";

export function DeliveryCartClient({ storeOpen }: { storeOpen: boolean }) {
  const router = useRouter();
  const { session, sessionReady, isLocationReady } = useDeliverySession();
  const { items, updateQuantity, removeItem, itemCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    if (!sessionReady) return;
    if (!isLocationReady) {
      router.replace("/orders/delivery");
    }
  }, [sessionReady, isLocationReady, router]);

  useEffect(() => {
    setAppliedCoupon(readAppliedCoupon());
  }, []);

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
  const deliveryFee = appliedCoupon?.free_delivery
    ? 0
    : (session.delivery?.delivery_fee_inr ?? 0);
  const couponDiscount = appliedCoupon?.discount_inr ?? 0;
  const estimatedTotal = Math.max(0, subtotal - couponDiscount + deliveryFee);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponMessage("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          phone: session.phone,
          subtotal,
          delivery_fee_inr: session.delivery?.delivery_fee_inr ?? 0,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        const next: AppliedCoupon = {
          code: couponCode.toUpperCase().trim(),
          discount_inr: data.discount_inr,
          free_delivery: data.free_delivery,
        };
        setAppliedCoupon(next);
        writeAppliedCoupon(next);
        setCouponMessage("Coupon applied!");
      } else {
        setAppliedCoupon(null);
        writeAppliedCoupon(null);
        setCouponMessage(data.message || "Invalid coupon");
      }
    } catch {
      setCouponMessage("Could not apply coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    writeAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
  };

  if (!sessionReady || !isLocationReady) return null;

  return (
    <div className="flex min-h-screen flex-col pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <OrderFlowHeader title="Your cart" backHref="/orders/delivery/menu" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {!storeOpen && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            Store is closed — ordering is unavailable right now.
          </p>
        )}

        {loading && itemCount > 0 ? (
          <p className="mt-8 text-center text-sm text-chocolate/50">Loading...</p>
        ) : itemCount === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-sm text-chocolate/60">Your cart is empty</p>
            <Link
              href="/orders/delivery/menu"
              className="mt-4 inline-block rounded-full bg-chocolate px-6 py-3 text-sm text-cream"
            >
              Browse menu
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {cartLines.map((line) => (
                <div
                  key={line.productId}
                  className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-chocolate/10"
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
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-chocolate">
                        {line.product.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeItem(line.productId)}
                        className="text-chocolate/30 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-chocolate/50">
                      {formatCurrency(line.unitPrice)} each
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(line.productId, line.quantity - 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-cream"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-[1.25rem] text-center text-sm font-medium">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(line.productId, line.quantity + 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-chocolate text-cream"
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

            <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-chocolate/10">
              <p className="text-xs font-medium uppercase tracking-wide text-chocolate/50">
                Coupon code
              </p>
              {appliedCoupon ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800 ring-1 ring-green-200">
                    {appliedCoupon.code} applied
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs text-chocolate/60 underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 rounded-xl border border-chocolate/10 bg-cream px-3 py-2.5 text-sm uppercase outline-none focus:border-chocolate/30"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="shrink-0 rounded-xl bg-chocolate px-4 py-2.5 text-sm font-medium text-cream disabled:opacity-40"
                  >
                    {applyingCoupon ? "..." : "Apply"}
                  </button>
                </div>
              )}
              {couponMessage && !appliedCoupon && (
                <p className="mt-2 text-xs text-red-600">{couponMessage}</p>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 text-sm ring-1 ring-chocolate/10">
              <div className="flex justify-between">
                <span className="text-chocolate/60">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="mt-2 flex justify-between text-green-700">
                  <span>Coupon discount</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between">
                <span className="text-chocolate/60">Delivery</span>
                <span>
                  {appliedCoupon?.free_delivery
                    ? "FREE"
                    : formatCurrency(session.delivery?.delivery_fee_inr ?? 0)}
                </span>
              </div>
              <div className="mt-3 flex justify-between border-t border-chocolate/10 pt-3 font-semibold">
                <span>Estimated total</span>
                <span>{formatCurrency(estimatedTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!storeOpen}
              onClick={() => router.push("/orders/delivery/checkout")}
              className="mt-5 w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
            >
              Continue to checkout
            </button>
          </>
        )}
      </main>
    </div>
  );
}
