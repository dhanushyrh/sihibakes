"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CheckoutAuthSheet } from "@/components/orders/CheckoutAuthSheet";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { useCart } from "@/components/store/CartProvider";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import { isValidIndianPhone } from "@/lib/checkout-validation";
import { resolveCheckoutPath } from "@/lib/checkout-routing";
import { prefillCustomerFromLookup } from "@/lib/customer-prefill";
import { formatCurrency } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";
import { getMenuProductIds, isMenuProduct } from "@/lib/cart-products";
import { formatDeliveryModeSummary } from "@/lib/delivery-mode-availability";
import { trackActivity } from "@/lib/activity-tracker";
import type { Product } from "@/lib/types";
import { OrderFlowLoading } from "@/components/store/OrderFlowLoading";
import { CartLinesSkeleton } from "@/components/store/StorePageSkeleton";
import { Spinner } from "@/components/ui/Spinner";

export function DeliveryCartClient({ storeOpen }: { storeOpen: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    session,
    sessionReady,
    isDeliveryModeReady,
    setCustomer,
    setAddress,
    setLocation,
    setVerifiedPhone,
  } = useDeliverySession();
  const { items, updateQuantity, removeItem, itemCount, pruneItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [unavailableNotice, setUnavailableNotice] = useState("");

  useEffect(() => {
    if (!sessionReady) return;
    if (!isDeliveryModeReady) {
      router.replace("/orders/delivery");
    }
  }, [sessionReady, isDeliveryModeReady, router]);

  useEffect(() => {
    if (searchParams.get("auth") === "1") {
      const timer = window.setTimeout(() => setAuthSheetOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    const ids = items.map((i) => i.productId);
    if (!ids.length) {
      const timer = window.setTimeout(() => {
        setProducts([]);
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (!session.deliveryDate) return;

    const params = new URLSearchParams({
      ids: ids.join(","),
      delivery_date: session.deliveryDate,
    });
    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((data: Product[]) => {
        setProducts(data);
        const validIds = new Set(getMenuProductIds(data));
        const removedCount = items.filter((i) => !validIds.has(i.productId)).length;
        pruneItems([...validIds]);
        if (removedCount > 0) {
          setUnavailableNotice(
            "Some items are unavailable for your selected delivery date and were removed."
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [items, session.deliveryDate, pruneItems]);

  useEffect(() => {
    if (loading || products.length === 0) return;
    pruneItems(getMenuProductIds(products));
  }, [loading, products, pruneItems]);

  const cartLines = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product || !isMenuProduct(product)) return null;
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
  const deliveryFee = session.delivery?.delivery_fee_inr;
  const estimatedTotal = subtotal + (deliveryFee ?? 0);

  const navigateAfterAuth = useCallback(
    async (phone: string) => {
      setVerifiedPhone(phone);
      trackActivity("phone_verified", "phone_verified", { phone });

      const result = await prefillCustomerFromLookup(phone, {
        sessionLat: session.lat,
        sessionLng: session.lng,
        setCustomer,
        setAddress,
        setLocation,
      });

      const path = resolveCheckoutPath(session, result.profile, {
        prefilledLocationReachable: result.locationReachable,
      });

      setAuthSheetOpen(false);
      router.push(path);
    },
    [
      session,
      setVerifiedPhone,
      setCustomer,
      setAddress,
      setLocation,
      router,
    ]
  );

  const handleContinueCheckout = async () => {
    if (session.phoneVerified && isValidIndianPhone(session.whatsappPhone)) {
      setContinuing(true);
      try {
        const statusRes = await fetch(
          `/api/otp/status?phone=${encodeURIComponent(session.whatsappPhone)}`
        );
        const status = await statusRes.json();

        if (statusRes.ok && status.ready) {
          const result = await prefillCustomerFromLookup(session.whatsappPhone, {
            sessionLat: session.lat,
            sessionLng: session.lng,
            setCustomer,
            setAddress,
            setLocation,
          });
          const path = resolveCheckoutPath(session, result.profile, {
            prefilledLocationReachable: result.locationReachable,
          });
          router.push(path);
          return;
        }

        setAuthSheetOpen(true);
      } finally {
        setContinuing(false);
      }
      return;
    }
    setAuthSheetOpen(true);
  };

  if (!sessionReady || !isDeliveryModeReady) {
    return <OrderFlowLoading />;
  }

  const scheduleSummary =
    session.deliveryMode && session.deliveryDate
      ? formatDeliveryModeSummary(session.deliveryMode, session.deliveryDate)
      : null;

  return (
    <div className="flex min-h-screen flex-col pb-[env(safe-area-inset-bottom)]">
      <OrderFlowHeader title="Your cart" backHref="/orders/delivery/menu" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {scheduleSummary && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-chocolate/10">
            <p className="text-sm font-medium text-chocolate">{scheduleSummary}</p>
            <Link
              href="/orders/delivery"
              className="shrink-0 text-xs font-medium text-chocolate/60 underline"
            >
              Edit
            </Link>
          </div>
        )}

        {unavailableNotice && (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            {unavailableNotice}
          </p>
        )}

        {!storeOpen && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            Store is closed — ordering is unavailable right now.
          </p>
        )}

        {loading && itemCount > 0 ? (
          <CartLinesSkeleton />
        ) : cartLines.length === 0 ? (
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

            <div className="mt-6 rounded-2xl bg-white p-4 text-sm ring-1 ring-chocolate/10">
              <div className="flex justify-between">
                <span className="text-chocolate/60">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-chocolate/60">Delivery</span>
                <span>
                  {deliveryFee != null
                    ? formatCurrency(deliveryFee)
                    : "At checkout"}
                </span>
              </div>
              <div className="mt-3 flex justify-between border-t border-chocolate/10 pt-3 font-semibold">
                <span>Estimated total</span>
                <span>{formatCurrency(estimatedTotal)}</span>
              </div>
              <p className="mt-3 text-xs text-chocolate/50">
                Coupon codes can be applied at checkout.
              </p>
            </div>

            <button
              type="button"
              disabled={!storeOpen || continuing}
              onClick={() => void handleContinueCheckout()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
            >
              {continuing ? (
                <>
                  <Spinner size="sm" className="!text-cream/80" label="Continuing to checkout" />
                  <span>Continuing…</span>
                </>
              ) : (
                "Continue to checkout"
              )}
            </button>
          </>
        )}
      </main>

      <CheckoutAuthSheet
        open={authSheetOpen}
        onClose={() => setAuthSheetOpen(false)}
        onVerified={navigateAfterAuth}
        initialPhone={session.whatsappPhone}
      />
    </div>
  );
}
