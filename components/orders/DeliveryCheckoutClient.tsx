"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Check } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { useCart } from "@/components/store/CartProvider";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import {
  readAppliedCoupon,
  writeAppliedCoupon,
  type AppliedCoupon,
} from "@/lib/applied-coupon";
import { formatCurrency } from "@/lib/delivery";
import { normalizePhone } from "@/lib/storefront";
import { getUnitPrice } from "@/lib/pricing";
import {
  getBookableDates,
  getSlotsForBookableDate,
} from "@/lib/customer-delivery-slots";
import type { DeliverySlot, Product } from "@/lib/types";

export function DeliveryCheckoutClient({
  initialSlots,
  storeOpen,
}: {
  initialSlots: DeliverySlot[];
  storeOpen: boolean;
}) {
  const router = useRouter();
  const { items, clearCart, itemCount } = useCart();
  const {
    session,
    sessionReady,
    isLocationReady,
    setAddress,
    setCustomer,
    clearSession,
  } = useDeliverySession();

  const [products, setProducts] = useState<Product[]>([]);
  const [bookableSlots, setBookableSlots] = useState(initialSlots);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionReady) return;
    if (!isLocationReady) router.replace("/orders/delivery");
    else if (itemCount === 0) router.replace("/orders/delivery/cart");
  }, [sessionReady, isLocationReady, itemCount, router]);

  useEffect(() => {
    setAppliedCoupon(readAppliedCoupon());
  }, []);

  useEffect(() => {
    const ids = items.map((i) => i.productId);
    if (!ids.length) return;
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then(setProducts);
  }, [items]);

  useEffect(() => {
    fetch("/api/delivery/slots")
      .then((r) => r.json())
      .then(setBookableSlots)
      .catch(() => setBookableSlots(initialSlots));
  }, [initialSlots]);

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
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);

  const availableDates = useMemo(
    () => getBookableDates(bookableSlots),
    [bookableSlots]
  );
  const slotsForDate = useMemo(
    () => getSlotsForBookableDate(bookableSlots, selectedDate),
    [bookableSlots, selectedDate]
  );

  const detailsValid =
    session.customerName.trim().length >= 2 &&
    session.phone.replace(/\D/g, "").length >= 10 &&
    session.house.trim().length > 0 &&
    session.street.trim().length > 0 &&
    session.pincode.trim().length >= 6 &&
    Boolean(selectedSlotId);

  const createOrder = async () => {
    const phone = normalizePhone(session.phone.trim());
    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        customer_name: session.customerName.trim(),
        phone,
        house: session.house.trim(),
        street: session.street.trim(),
        landmark: session.landmark.trim() || undefined,
        pincode: session.pincode.trim(),
        delivery_lat: session.lat,
        delivery_lng: session.lng,
        delivery_slot_id: selectedSlotId,
        coupon_code: appliedCoupon?.code || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Order failed");
    }
    return {
      order_id: data.order_id as string,
      order_number: data.order_number as string,
      total_inr: data.total_inr as number,
      phone,
    };
  };

  const completeMockPayment = async (order: {
    order_id: string;
    order_number: string;
    phone: string;
  }) => {
    const res = await fetch("/api/orders/mock-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.order_id,
        order_number: order.order_number,
        phone: order.phone,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Could not confirm order");
    }
  };

  const placeOrder = async () => {
    setPlacingOrder(true);
    setError("");
    try {
      const placed = await createOrder();
      await completeMockPayment(placed);
      clearCart();
      clearSession();
      writeAppliedCoupon(null);
      router.push(
        `/order/${placed.order_number}?phone=${encodeURIComponent(placed.phone)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!sessionReady || !isLocationReady || itemCount === 0) return null;

  if (!storeOpen) {
    return (
      <div className="flex min-h-screen flex-col">
        <OrderFlowHeader title="Checkout" backHref="/orders/delivery/cart" />
        <main className="flex flex-1 items-center justify-center p-6 text-center text-sm text-chocolate/60">
          Store is closed. Please try again later.
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <OrderFlowHeader title="Checkout" backHref="/orders/delivery/cart" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-chocolate">
            Your details
          </h2>
          <p className="text-sm text-chocolate/60">
            Confirm delivery address for the pinned map location.
          </p>

          {[
            {
              label: "Full name",
              value: session.customerName,
              onChange: (v: string) => setCustomer({ customerName: v }),
            },
            {
              label: "Phone",
              value: session.phone,
              onChange: (v: string) => setCustomer({ phone: v }),
              type: "tel",
            },
            {
              label: "House / Flat no.",
              value: session.house,
              onChange: (v: string) => setAddress({ house: v }),
            },
            {
              label: "Street / Area",
              value: session.street,
              onChange: (v: string) => setAddress({ street: v }),
            },
            {
              label: "Landmark (optional)",
              value: session.landmark,
              onChange: (v: string) => setAddress({ landmark: v }),
            },
            {
              label: "Pincode",
              value: session.pincode,
              onChange: (v: string) => setAddress({ pincode: v }),
            },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-xs text-chocolate/55">{field.label}</label>
              <input
                type={field.type || "text"}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
              />
            </div>
          ))}

          <div>
            <label className="text-xs text-chocolate/55">Delivery date</label>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
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
                      ? "bg-chocolate text-cream"
                      : "bg-white ring-1 ring-chocolate/10"
                  }`}
                >
                  {format(parseISO(date), "EEE, d MMM")}
                </button>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div className="space-y-2">
              <label className="text-xs text-chocolate/55">Time slot</label>
              {slotsForDate.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm ${
                    selectedSlotId === slot.id
                      ? "bg-chocolate text-cream"
                      : "bg-white ring-1 ring-chocolate/10"
                  }`}
                >
                  <span>
                    {slot.window_start.slice(0, 5)} –{" "}
                    {slot.window_end.slice(0, 5)}
                  </span>
                  {selectedSlotId === slot.id && <Check size={16} />}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-chocolate/10">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="mt-1 flex justify-between text-green-700">
                <span>Coupon ({appliedCoupon?.code})</span>
                <span>-{formatCurrency(couponDiscount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between">
              <span>Delivery</span>
              <span>
                {appliedCoupon?.free_delivery
                  ? "FREE"
                  : formatCurrency(session.delivery?.delivery_fee_inr ?? 0)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-chocolate/10 pt-2 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={!detailsValid || placingOrder}
            onClick={placeOrder}
            className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
          >
            {placingOrder ? "Placing order..." : "Place order"}
          </button>
        </div>
      </main>
    </div>
  );
}
