"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Minus, Plus } from "lucide-react";
import { IndianPhoneInput } from "@/components/store/IndianPhoneInput";
import { formatCurrency } from "@/lib/delivery";
import { isValidIndianPhone, isValidIndianPincode } from "@/lib/checkout-validation";
import {
  OFFLINE_NO_SLOT_WINDOW,
  PAYMENT_MODE_OPTIONS,
  formatPaymentMode,
  isBarterCollabMode,
} from "@/lib/offline-orders";
import { calcLineTotal, calcSubtotal, getUnitPrice } from "@/lib/pricing";
import { shopDateKey } from "@/lib/shop-timezone";
import type { DeliverySlot, PaymentMode, Product } from "@/lib/types";

type CartQty = Record<string, number>;

const NO_SLOT = "__none__";

const inputClass =
  "mt-1 w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 py-2 text-sm text-[#4B2C20] outline-none focus:border-[#4B2C20]/30";
const labelClass = "block text-sm font-medium text-[#4B2C20]";
const sectionClass =
  "rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10";

function formatSlotWindow(start: string, end: string): string {
  return `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
}

export function CreateOfflineOrderForm({
  products,
  slots,
}: {
  products: Product[];
  slots: DeliverySlot[];
}) {
  const router = useRouter();
  const today = shopDateKey();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [house, setHouse] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [cart, setCart] = useState<CartQty>({});
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [slotId, setSlotId] = useState(NO_SLOT);
  const [windowStart, setWindowStart] = useState(
    OFFLINE_NO_SLOT_WINDOW.start.slice(0, 5)
  );
  const [windowEnd, setWindowEnd] = useState(
    OFFLINE_NO_SLOT_WINDOW.end.slice(0, 5)
  );
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [paymentReceived, setPaymentReceived] = useState(true);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("upi");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [amount, setAmount] = useState("0");
  const [amountTouched, setAmountTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupHint, setLookupHint] = useState<string | null>(null);
  const lastLookupPhone = useRef("");

  const slotsForDate = useMemo(
    () =>
      slots
        .filter((s) => s.slot_date === deliveryDate)
        .sort((a, b) => a.window_start.localeCompare(b.window_start)),
    [slots, deliveryDate]
  );

  const useNoSlot = slotId === NO_SLOT;
  const selectedSlot = useNoSlot
    ? null
    : slots.find((s) => s.id === slotId) ?? null;

  const cartItems = useMemo(() => {
    return products
      .filter((p) => (cart[p.id] ?? 0) > 0)
      .map((product) => ({
        product,
        quantity: cart[product.id] ?? 0,
      }));
  }, [products, cart]);

  const itemCount = cartItems.reduce((n, i) => n + i.quantity, 0);
  const { subtotal } = useMemo(() => calcSubtotal(cartItems), [cartItems]);
  const feeNum = Math.max(0, Math.floor(Number(deliveryFee) || 0));
  const suggestedTotal = isBarterCollabMode(paymentMode)
    ? 0
    : subtotal + feeNum;

  useEffect(() => {
    if (!amountTouched) {
      setAmount(String(suggestedTotal));
    }
  }, [suggestedTotal, amountTouched]);

  useEffect(() => {
    if (slotId !== NO_SLOT && !slotsForDate.some((s) => s.id === slotId)) {
      setSlotId(slotsForDate[0]?.id ?? NO_SLOT);
    }
  }, [slotsForDate, slotId]);

  const setQty = (productId: string, next: number) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[productId];
      else copy[productId] = next;
      return copy;
    });
  };

  const onPaymentModeChange = (mode: PaymentMode) => {
    setPaymentMode(mode);
    if (isBarterCollabMode(mode)) {
      setAmountTouched(true);
      setAmount("0");
      setDeliveryFee("0");
      setPaymentReceived(true);
    } else {
      setAmountTouched(false);
    }
  };

  const lookupCustomer = async () => {
    if (!isValidIndianPhone(phone) || phone === lastLookupPhone.current) return;
    lastLookupPhone.current = phone;
    setLookupHint(null);

    try {
      const res = await fetch("/api/customers/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.found) {
        setLookupHint(res.ok ? "New customer" : null);
        return;
      }

      if (data.customer_name && !name) setName(data.customer_name);
      if (data.alt_phone && !altPhone) setAltPhone(data.alt_phone);
      if (data.house && !house) setHouse(data.house);
      if (data.street && !street) setStreet(data.street);
      if (data.landmark && !landmark) setLandmark(data.landmark);
      if (data.pincode && !pincode) setPincode(data.pincode);
      if (data.delivery_lat != null && !lat) {
        setLat(String(data.delivery_lat));
        setShowPin(true);
      }
      if (data.delivery_lng != null && !lng) {
        setLng(String(data.delivery_lng));
        setShowPin(true);
      }
      setLookupHint("Prefilled from previous order");
    } catch {
      /* ignore lookup failures */
    }
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Enter customer name";
    if (!isValidIndianPhone(phone)) return "Enter a valid 10-digit phone number";
    if (altPhone && !isValidIndianPhone(altPhone)) {
      return "Enter a valid alternate phone number";
    }
    if (altPhone && altPhone === phone) {
      return "Alternate contact must be different from the primary number";
    }
    if (itemCount === 0) return "Add at least one item";
    if (!house.trim() || !street.trim()) return "Enter house and street";
    if (!isValidIndianPincode(pincode)) return "Enter a valid 6-digit pincode";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) return "Select a delivery date";
    if (!useNoSlot && !selectedSlot) return "Select a delivery slot";
    if (useNoSlot) {
      if (!/^\d{2}:\d{2}$/.test(windowStart) || !/^\d{2}:\d{2}$/.test(windowEnd)) {
        return "Enter a valid time window";
      }
      if (windowStart >= windowEnd) return "Window end must be after start";
    }
    if (!paymentMode) return "Select a payment mode";
    const total = Number(amount);
    if (!Number.isFinite(total) || total < 0 || !Number.isInteger(total)) {
      return "Enter a valid whole-rupee amount";
    }
    if (lat || lng) {
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return "Map pin needs valid latitude and longitude";
      }
    }
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: name.trim(),
        phone,
        alt_phone: altPhone || undefined,
        house: house.trim(),
        street: street.trim(),
        landmark: landmark.trim() || undefined,
        pincode: pincode.trim(),
        delivery_lat: lat ? Number(lat) : null,
        delivery_lng: lng ? Number(lng) : null,
        delivery_slot_id: useNoSlot ? null : slotId,
        delivery_date: deliveryDate,
        delivery_window_start: useNoSlot ? windowStart : undefined,
        delivery_window_end: useNoSlot ? windowEnd : undefined,
        payment_received: paymentReceived,
        payment_mode: paymentMode,
        amount_inr: Number(amount),
        delivery_fee_inr: feeNum,
        send_whatsapp_confirmation: sendWhatsApp,
        items: cartItems.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create order");
      return;
    }

    if (sendWhatsApp && data.whatsapp && !data.whatsapp.ok) {
      // Order exists — land on detail with a soft warning via query.
      router.push(
        `/admin/orders/${data.id}?created=offline&wa=failed`
      );
      return;
    }

    router.push(`/admin/orders/${data.id}?created=offline`);
  };

  const scheduleSummary = selectedSlot
    ? `${format(parseISO(selectedSlot.slot_date), "d MMM")} · ${formatSlotWindow(
        selectedSlot.window_start,
        selectedSlot.window_end
      )}`
    : deliveryDate
      ? `${format(parseISO(deliveryDate), "d MMM")} · ${windowStart} – ${windowEnd}`
      : "Select a date";

  return (
    <div className="pb-28">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20]"
      >
        <ArrowLeft size={14} /> Orders
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-[#4B2C20]">
        Create offline order
      </h1>
      <p className="mt-1 text-sm text-[#4B2C20]/60">
        WhatsApp / Instagram / barter — past dates and no-slot allowed; does not
        count against daily stock.
      </p>

      <div className="mt-6 space-y-4">
        <section className={sectionClass}>
          <h2 className="font-medium text-[#4B2C20]">Customer</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="offline-phone">
                Phone
              </label>
              <div
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    void lookupCustomer();
                  }
                }}
              >
                <IndianPhoneInput
                  id="offline-phone"
                  value={phone}
                  onChange={(v) => {
                    setPhone(v);
                    lastLookupPhone.current = "";
                  }}
                  invalid={phone.length === 10 && !isValidIndianPhone(phone)}
                />
              </div>
              {lookupHint ? (
                <p className="mt-1 text-xs text-[#4B2C20]/50">{lookupHint}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="offline-name">
                Name
              </label>
              <input
                id="offline-name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="offline-alt">
                Alternate phone (optional)
              </label>
              <IndianPhoneInput
                id="offline-alt"
                value={altPhone}
                onChange={setAltPhone}
              />
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-medium text-[#4B2C20]">Items</h2>
            <p className="text-xs text-[#4B2C20]/50">
              {itemCount} item{itemCount === 1 ? "" : "s"} · {formatCurrency(subtotal)}
            </p>
          </div>
          {products.length === 0 ? (
            <p className="mt-4 text-sm text-[#4B2C20]/60">No active products.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#4B2C20]/10">
              {products.map((product) => {
                const qty = cart[product.id] ?? 0;
                const unit = getUnitPrice(product);
                return (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#4B2C20]">
                        {product.title}
                      </p>
                      <p className="text-xs text-[#4B2C20]/50">
                        {formatCurrency(unit)}
                        {qty > 0 ? ` · ${formatCurrency(calcLineTotal(product, qty))}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Decrease ${product.title}`}
                        disabled={qty === 0}
                        onClick={() => setQty(product.id, qty - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5E6D3] text-[#4B2C20] disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-[#4B2C20]">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${product.title}`}
                        onClick={() => setQty(product.id, qty + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4B2C20] text-white"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-[#4B2C20]">Address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="offline-house">
                House / flat
              </label>
              <input
                id="offline-house"
                className={inputClass}
                value={house}
                onChange={(e) => setHouse(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="offline-pincode">
                Pincode
              </label>
              <input
                id="offline-pincode"
                className={inputClass}
                value={pincode}
                onChange={(e) =>
                  setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="offline-street">
                Street / area
              </label>
              <input
                id="offline-street"
                className={inputClass}
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="offline-landmark">
                Landmark (optional)
              </label>
              <input
                id="offline-landmark"
                className={inputClass}
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPin((v) => !v)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#4B2C20]/70 hover:text-[#4B2C20]"
          >
            {showPin ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showPin ? "Hide map pin" : "Add map pin (optional)"}
          </button>
          {showPin ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="offline-lat">
                  Latitude
                </label>
                <input
                  id="offline-lat"
                  className={inputClass}
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="12.9716"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="offline-lng">
                  Longitude
                </label>
                <input
                  id="offline-lng"
                  className={inputClass}
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="77.5946"
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-[#4B2C20]">Delivery</h2>
          <p className="mt-1 text-xs text-[#4B2C20]/50">
            Past dates allowed. Slot is optional — use custom times when none exist.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="offline-date">
                Date
              </label>
              <input
                id="offline-date"
                type="date"
                className={inputClass}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="offline-slot">
                Slot
              </label>
              <select
                id="offline-slot"
                className={inputClass}
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
              >
                <option value={NO_SLOT}>No slot (custom window)</option>
                {slotsForDate.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {formatSlotWindow(slot.window_start, slot.window_end)}
                  </option>
                ))}
              </select>
              {slotsForDate.length === 0 ? (
                <p className="mt-1 text-xs text-[#4B2C20]/45">
                  No saved slots for this date — custom window will be used.
                </p>
              ) : null}
            </div>
            {useNoSlot ? (
              <>
                <div>
                  <label className={labelClass} htmlFor="offline-window-start">
                    Window start
                  </label>
                  <input
                    id="offline-window-start"
                    type="time"
                    className={inputClass}
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="offline-window-end">
                    Window end
                  </label>
                  <input
                    id="offline-window-end"
                    type="time"
                    className={inputClass}
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-[#4B2C20]">Payment</h2>
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#F5E6D3]/50 px-4 py-3">
              <span className="text-sm font-medium text-[#4B2C20]">
                {isBarterCollabMode(paymentMode)
                  ? "Barter settled"
                  : "Payment received"}
              </span>
              <input
                type="checkbox"
                checked={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.checked)}
                className="h-5 w-5 rounded border-[#4B2C20]/30 text-[#4B2C20] focus:ring-[#4B2C20]/30"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#F5E6D3]/50 px-4 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[#4B2C20]">
                  Send WhatsApp confirmation
                </span>
                <span className="mt-0.5 block text-xs text-[#4B2C20]/50">
                  Uses the same order confirmed template as online orders
                </span>
              </span>
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="h-5 w-5 shrink-0 rounded border-[#4B2C20]/30 text-[#4B2C20] focus:ring-[#4B2C20]/30"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="offline-mode">
                  Mode
                </label>
                <select
                  id="offline-mode"
                  className={inputClass}
                  value={paymentMode}
                  onChange={(e) =>
                    onPaymentModeChange(e.target.value as PaymentMode)
                  }
                >
                  {PAYMENT_MODE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {isBarterCollabMode(paymentMode) ? (
                  <p className="mt-1 text-xs text-[#4B2C20]/50">
                    Amount defaults to ₹0 for barter / collab orders.
                  </p>
                ) : null}
              </div>
              <div>
                <label className={labelClass} htmlFor="offline-fee">
                  Delivery fee (₹)
                </label>
                <input
                  id="offline-fee"
                  className={inputClass}
                  inputMode="numeric"
                  value={deliveryFee}
                  onChange={(e) =>
                    setDeliveryFee(e.target.value.replace(/[^\d]/g, ""))
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="offline-amount">
                  Amount (₹)
                </label>
                <input
                  id="offline-amount"
                  className={inputClass}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => {
                    setAmountTouched(true);
                    setAmount(e.target.value.replace(/[^\d]/g, ""));
                  }}
                />
                {amountTouched &&
                !isBarterCollabMode(paymentMode) &&
                Number(amount) !== suggestedTotal ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAmountTouched(false);
                      setAmount(String(suggestedTotal));
                    }}
                    className="mt-1 text-xs font-medium text-[#4B2C20]/60 hover:text-[#4B2C20]"
                  >
                    Reset to {formatCurrency(suggestedTotal)}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#4B2C20]/10 bg-[#F5E6D3]/95 px-4 py-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-[#4B2C20]">
            <p className="font-medium">
              {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
              {formatCurrency(Number(amount) || 0)}
              {isBarterCollabMode(paymentMode)
                ? " · Barter"
                : paymentReceived
                  ? ""
                  : " · Unpaid"}
            </p>
            <p className="truncate text-xs text-[#4B2C20]/60">
              {scheduleSummary} · {formatPaymentMode(paymentMode)}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#4B2C20] px-6 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Create order
          </button>
        </div>
      </div>
    </div>
  );
}
