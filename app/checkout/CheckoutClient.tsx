"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { StoreHeader } from "@/components/store/StoreHeader";
import { OrdersPausedBanner } from "@/components/store/StoreFooter";
import { MapPicker } from "@/components/store/MapPicker";
import { DeliverySlotSelects } from "@/components/store/DeliverySlotSelects";
import { useCart } from "@/components/store/CartProvider";
import { useScrollToTopOnChange } from "@/components/store/ScrollToTop";
import { formatCurrency, formatDistance } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";
import { buildRazorpayCheckoutOptions } from "@/lib/razorpay";
import {
  formatRazorpayPaymentError,
  formatRazorpayVerifyError,
} from "@/lib/razorpay-errors";
import { releaseOrderInventoryHold } from "@/lib/inventory-client";
import { formatDeliveryFenceShort } from "@/lib/delivery-fence";
import type { DeliveryCalculation, DeliveryFenceKm, DeliverySlot, Product } from "@/lib/types";
import {
  getSlotsForBookableDate,
  resolveDeliverySelection,
} from "@/lib/customer-delivery-slots";
import { DEFAULT_KITCHEN } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import "@/lib/razorpay-checkout";
import { Spinner, SpinnerCentered } from "@/components/ui/Spinner";

interface CheckoutPageProps {
  slots: DeliverySlot[];
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
  storeOpen: boolean;
  storeClosedMessage: string | null;
  paymentSkipEnabled: boolean;
}

const STEPS = ["Location", "Address", "Delivery", "Coupon", "Pay"];

export default function CheckoutPage({
  slots: initialSlots,
  kitchenLat,
  kitchenLng,
  deliveryFence,
  storeOpen,
  storeClosedMessage,
  paymentSkipEnabled,
}: CheckoutPageProps) {
  const router = useRouter();
  const { items, clearCart, itemCount } = useCart();
  const [step, setStep] = useState(0);
  useScrollToTopOnChange(step);
  const [bookableSlots, setBookableSlots] = useState<DeliverySlot[]>(initialSlots);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [lat, setLat] = useState(kitchenLat + 0.01);
  const [lng, setLng] = useState(kitchenLng + 0.01);
  const [delivery, setDelivery] = useState<DeliveryCalculation | null>(null);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [house, setHouse] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [error, setError] = useState("");

  // next/script fires onLoad only on full page loads; on client navigation the
  // checkout.js tag already exists, so poll for window.Razorpay as a fallback.
  useEffect(() => {
    if (razorpayReady) return;
    if (typeof window !== "undefined" && window.Razorpay) {
      setRazorpayReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.Razorpay) {
        setRazorpayReady(true);
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [razorpayReady]);

  useEffect(() => {
    const ids = items.map((i) => i.productId);
    if (!ids.length) return;
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then(setProducts);
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
  const baseDeliveryFee = delivery?.delivery_fee_inr ?? 0;
  const deliveryFee = freeDelivery ? 0 : baseDeliveryFee;
  // Free-delivery coupons only waive the delivery fee, never reduce the subtotal.
  const effectiveCouponDiscount = freeDelivery ? 0 : couponDiscount;
  const total = Math.max(0, subtotal - effectiveCouponDiscount + deliveryFee);

  const slotsForDate = useMemo(
    () => getSlotsForBookableDate(bookableSlots, selectedDate),
    [bookableSlots, selectedDate]
  );

  useEffect(() => {
    if (step !== 2) return;

    let cancelled = false;
    setLoadingSlots(true);

    fetch("/api/delivery/slots")
      .then((r) => r.json())
      .then((data: DeliverySlot[]) => {
        if (cancelled) return;
        setBookableSlots(data);
      })
      .catch(() => {
        if (!cancelled) setBookableSlots(initialSlots);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, initialSlots]);

  useEffect(() => {
    if (!bookableSlots.length) return;
    const next = resolveDeliverySelection(bookableSlots, {
      date: selectedDate,
      slotId: selectedSlotId,
    });
    if (next.date !== selectedDate) setSelectedDate(next.date);
    if (next.slotId !== selectedSlotId) setSelectedSlotId(next.slotId);
  }, [bookableSlots, selectedDate, selectedSlotId]);

  const calcDelivery = async (newLat: number, newLng: number) => {
    setLoadingDelivery(true);
    try {
      const res = await fetch("/api/delivery/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: newLat, lng: newLng }),
      });
      const data = await res.json();
      setDelivery(data);
    } finally {
      setLoadingDelivery(false);
    }
  };

  useEffect(() => {
    calcDelivery(lat, lng);
  }, [lat, lng]);

  const applyCoupon = async () => {
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponCode,
        phone,
        subtotal,
        delivery_fee_inr: delivery?.delivery_fee_inr ?? 0,
      }),
    });
    const data = await res.json();
    if (data.valid) {
      setCouponDiscount(data.discount_inr);
      setFreeDelivery(data.free_delivery);
      setCouponMessage("Coupon applied!");
    } else {
      setCouponDiscount(0);
      setFreeDelivery(false);
      setCouponMessage(data.message || "Invalid coupon");
    }
  };

  const placeOrder = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer_name: name,
          phone,
          house,
          street,
          landmark,
          pincode,
          delivery_lat: lat,
          delivery_lng: lng,
          delivery_slot_id: selectedSlotId,
          coupon_code: couponCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order failed");
        return;
      }

      const skipPayment = Boolean(data.payment_skip_enabled) || paymentSkipEnabled;
      if (skipPayment) {
        const skipRes = await fetch("/api/orders/skip-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: data.order_id,
            order_number: data.order_number,
            phone,
          }),
        });
        const skipData = await skipRes.json();
        if (!skipRes.ok) {
          setError(skipData.error || "Could not confirm order");
          return;
        }
        clearCart();
        router.push(`/order/${data.order_number}?phone=${phone}`);
        return;
      }

      if (!data.razorpay_order_id || !data.razorpay_key) {
        setError("Payment is not configured. Please try again later.");
        return;
      }
      if (!window.Razorpay) {
        setError("Payment is still loading. Please wait and try again.");
        return;
      }

      const releaseHold = () => {
        void releaseOrderInventoryHold(data.order_id as string, phone);
      };

      const rzp = new window.Razorpay({
        ...buildRazorpayCheckoutOptions({
          key: data.razorpay_key,
          orderId: data.razorpay_order_id,
          name: "Sihi Bakes",
          description: `Order ${data.order_number}`,
          prefill: { name, contact: phone },
        }),
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: data.order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            releaseHold();
            setError(formatRazorpayVerifyError(verifyData.error, verifyData.code));
            return;
          }
          clearCart();
          router.push(`/order/${data.order_number}?phone=${phone}`);
        },
        modal: {
          ondismiss: () => {
            releaseHold();
            setError("Payment was cancelled. You can try again.");
          },
        },
      });
      rzp.on("payment.failed", (response) => {
        releaseHold();
        setError(formatRazorpayPaymentError(response.error));
      });
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!storeOpen) {
    return (
      <div className="flex min-h-screen flex-col">
        {storeClosedMessage && (
          <OrdersPausedBanner
            accepting={false}
            message={storeClosedMessage}
            storeClosed
          />
        )}
        <StoreHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="font-serif text-xl font-semibold text-[#4B2C20]">
            Store closed
          </p>
          <p className="max-w-sm text-sm text-[#4B2C20]/60">
            {storeClosedMessage ??
              "We're not accepting orders right now. Please check back soon."}
          </p>
        </main>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <StoreHeader />
        <main className="flex flex-1 items-center justify-center p-4">
          <p className="text-sm text-[#4B2C20]/60">Your cart is empty.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
        onReady={() => setRazorpayReady(true)}
      />
      <StoreHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
          Checkout
        </h1>

        <div className="mt-4 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-[#4B2C20]" : "bg-[#4B2C20]/10"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-medium text-[#4B2C20]">Delivery Location</h2>
            <MapPicker
              kitchenLat={kitchenLat}
              kitchenLng={kitchenLng}
              lat={lat}
              lng={lng}
              deliveryFence={deliveryFence}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
            {loadingDelivery ? (
              <div className="flex items-center justify-center gap-2 text-center text-xs text-[#4B2C20]/50">
                <Spinner size="sm" label="Calculating delivery" />
                <span>Calculating…</span>
              </div>
            ) : delivery ? (
              <div
                className={`rounded-xl p-3 text-sm ${
                  delivery.reachable
                    ? "bg-white ring-1 ring-[#4B2C20]/10"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {delivery.reachable ? (
                  <>
                    <p>
                      Distance: {formatDistance(delivery.distance_km)}
                    </p>
                    <p className="font-semibold">
                      Delivery fee: {formatCurrency(delivery.delivery_fee_inr)}
                    </p>
                  </>
                ) : (
                  <p>{delivery.message}</p>
                )}
              </div>
            ) : null}
            <button
              type="button"
              disabled={!delivery?.reachable}
              onClick={() => setStep(1)}
              className="w-full rounded-full bg-[#4B2C20] py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-medium text-[#4B2C20]">Delivery Details</h2>
            {[
              { label: "Full Name", value: name, set: setName },
              { label: "Phone", value: phone, set: setPhone, type: "tel" },
              { label: "House / Flat No.", value: house, set: setHouse },
              { label: "Street / Area", value: street, set: setStreet },
              { label: "Landmark (optional)", value: landmark, set: setLandmark },
              { label: "Pincode", value: pincode, set: setPincode },
            ].map((field) => (
              <div key={field.label}>
                <label className="text-xs text-[#4B2C20]/60">{field.label}</label>
                <input
                  type={field.type || "text"}
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4B2C20]/30"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex-1 rounded-full border border-[#4B2C20]/20 py-3 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!name || phone.length < 10 || !house || !street || !pincode}
                onClick={() => setStep(2)}
                className="flex-1 rounded-full bg-[#4B2C20] py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-medium text-[#4B2C20]">Delivery Date & Time</h2>
            {loadingSlots ? (
              <SpinnerCentered size="md" label="Loading available slots" />
            ) : (
              <DeliverySlotSelects
                slots={bookableSlots}
                selectedDate={selectedDate}
                selectedSlotId={selectedSlotId}
                onDateChange={setSelectedDate}
                onSlotChange={setSelectedSlotId}
                emptyDatesMessage="No delivery dates available right now. Closed days and unavailable time slots are hidden."
                selectClassName="mt-1 w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4B2C20]/30"
                labelClassName="text-xs text-[#4B2C20]/55"
              />
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-full border py-3 text-sm">
                Back
              </button>
              <button
                type="button"
                disabled={!selectedSlotId}
                onClick={() => setStep(3)}
                className="flex-1 rounded-full bg-[#4B2C20] py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-medium text-[#4B2C20]">Coupon Code</h2>
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="flex-1 rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2.5 text-sm uppercase outline-none"
              />
              <button
                type="button"
                onClick={applyCoupon}
                className="rounded-xl bg-[#4B2C20] px-4 text-sm text-white"
              >
                Apply
              </button>
            </div>
            {couponMessage && (
              <p className={`text-xs ${couponDiscount > 0 ? "text-green-700" : "text-red-600"}`}>
                {couponMessage}
              </p>
            )}
            <div className="rounded-xl bg-white p-4 text-sm ring-1 ring-[#4B2C20]/10">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {effectiveCouponDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Coupon discount</span>
                  <span>-{formatCurrency(effectiveCouponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>
                  {freeDelivery ? (
                    <>
                      {baseDeliveryFee > 0 && (
                        <span className="mr-1 text-[#4B2C20]/40 line-through">
                          {formatCurrency(baseDeliveryFee)}
                        </span>
                      )}
                      <span className="font-medium text-green-700">FREE</span>
                    </>
                  ) : (
                    formatCurrency(deliveryFee)
                  )}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#4B2C20]/10 pt-2 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-full border py-3 text-sm">
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 rounded-full bg-[#4B2C20] py-3 text-sm font-medium text-white"
              >
                Continue to Pay
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-medium text-[#4B2C20]">Confirm & Pay</h2>
            <div className="rounded-xl bg-white p-4 text-sm ring-1 ring-[#4B2C20]/10 space-y-1">
              <p><strong>{name}</strong> · {phone}</p>
              <p className="text-[#4B2C20]/70">
                {house}, {street}
                {landmark ? `, ${landmark}` : ""} — {pincode}
              </p>
              {selectedDate && selectedSlotId && (
                <p className="text-[#4B2C20]/70">
                  {format(parseISO(selectedDate), "EEE, d MMM")} ·{" "}
                  {slotsForDate.find((s) => s.id === selectedSlotId)?.window_start.slice(0, 5)} –{" "}
                  {slotsForDate.find((s) => s.id === selectedSlotId)?.window_end.slice(0, 5)}
                </p>
              )}
              <p className="pt-2 text-lg font-semibold">{formatCurrency(total)}</p>
            </div>
            {paymentSkipEnabled && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900 ring-1 ring-amber-200">
                Payment bypass is on — this order will be placed without Razorpay.
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="flex-1 rounded-full border py-3 text-sm">
                Back
              </button>
              <button
                type="button"
                disabled={submitting || (!paymentSkipEnabled && !razorpayReady)}
                onClick={placeOrder}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#4B2C20] py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="!text-white/80" label="Processing payment" />
                    <span>Processing…</span>
                  </>
                ) : paymentSkipEnabled ? (
                  `Place order (skip payment) · ${formatCurrency(total)}`
                ) : (
                  `Pay ${formatCurrency(total)}`
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
