"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { StoreHeader } from "@/components/store/StoreHeader";
import { OrdersPausedBanner } from "@/components/store/StoreFooter";
import { MapPicker } from "@/components/store/MapPicker";
import { useCart } from "@/components/store/CartProvider";
import { formatCurrency, formatDistance } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/pricing";
import { formatDeliveryFenceShort } from "@/lib/delivery-fence";
import type { DeliveryCalculation, DeliveryFenceKm, DeliverySlot, Product } from "@/lib/types";
import {
  getBookableDates,
  getSlotsForBookableDate,
} from "@/lib/customer-delivery-slots";
import { DEFAULT_KITCHEN } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { Check } from "lucide-react";
import "@/lib/razorpay-checkout";

interface CheckoutPageProps {
  slots: DeliverySlot[];
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
  storeOpen: boolean;
  storeClosedMessage: string | null;
}

const STEPS = ["Location", "Address", "Delivery", "Coupon", "Pay"];

export default function CheckoutPage({
  slots: initialSlots,
  kitchenLat,
  kitchenLng,
  deliveryFence,
  storeOpen,
  storeClosedMessage,
}: CheckoutPageProps) {
  const router = useRouter();
  const { items, clearCart, itemCount } = useCart();
  const [step, setStep] = useState(0);
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
  const [error, setError] = useState("");

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
  const deliveryFee = freeDelivery ? 0 : (delivery?.delivery_fee_inr ?? 0);
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);

  const availableDates = useMemo(
    () => getBookableDates(bookableSlots),
    [bookableSlots]
  );

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
    if (!selectedDate) return;
    if (!availableDates.includes(selectedDate)) {
      setSelectedDate("");
      setSelectedSlotId("");
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (!selectedSlotId) return;
    if (!slotsForDate.some((s) => s.id === selectedSlotId)) {
      setSelectedSlotId("");
    }
  }, [slotsForDate, selectedSlotId]);

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

      if (data.razorpay_order_id && data.razorpay_key && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: data.razorpay_key,
          amount: data.total_inr * 100,
          currency: "INR",
          name: "Sihi Bakes",
          description: `Order ${data.order_number}`,
          order_id: data.razorpay_order_id,
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: data.order_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            clearCart();
            router.push(`/order/${data.order_number}?phone=${phone}`);
          },
          prefill: { name, contact: phone },
          theme: { color: "#4B2C20" },
        });
        rzp.open();
      } else {
        clearCart();
        router.push(`/order/${data.order_number}?phone=${phone}`);
      }
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
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
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
              <p className="text-center text-xs text-[#4B2C20]/50">Calculating...</p>
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
              <p className="text-center text-xs text-[#4B2C20]/50">
                Loading available slots...
              </p>
            ) : availableDates.length === 0 ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
                No delivery dates available right now. Closed days and unavailable
                time slots are hidden.
              </p>
            ) : (
              <>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {availableDates.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlotId("");
                  }}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium ${
                    selectedDate === date
                      ? "bg-[#4B2C20] text-white"
                      : "bg-white ring-1 ring-[#4B2C20]/10"
                  }`}
                >
                  {format(parseISO(date), "EEE, d MMM")}
                </button>
              ))}
            </div>
            {selectedDate && (
              <div className="space-y-2">
                {slotsForDate.length === 0 ? (
                  <p className="text-xs text-[#4B2C20]/50">
                    No time slots available for this date.
                  </p>
                ) : (
                  slotsForDate.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm ${
                      selectedSlotId === slot.id
                        ? "bg-[#4B2C20] text-white"
                        : "bg-white ring-1 ring-[#4B2C20]/10"
                    }`}
                  >
                    <span>
                      {slot.window_start.slice(0, 5)} – {slot.window_end.slice(0, 5)}
                    </span>
                    {selectedSlotId === slot.id && <Check size={16} />}
                  </button>
                ))
                )}
              </div>
            )}
              </>
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
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Coupon discount</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{freeDelivery ? "FREE" : formatCurrency(deliveryFee)}</span>
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="flex-1 rounded-full border py-3 text-sm">
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={placeOrder}
                className="flex-1 rounded-full bg-[#4B2C20] py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "Processing..." : `Pay ${formatCurrency(total)}`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
