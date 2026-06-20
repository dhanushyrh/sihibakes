"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { Check, Tag } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { useCart } from "@/components/store/CartProvider";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import {
  readAppliedCoupon,
  writeAppliedCoupon,
  type AppliedCoupon,
} from "@/lib/applied-coupon";
import {
  formatIndianPhoneInput,
  formatPincodeInput,
  isValidIndianPhone,
  isValidIndianPincode,
} from "@/lib/checkout-validation";
import { describeCoupon } from "@/lib/coupon-display";
import { isMenuProduct } from "@/lib/cart-products";
import { BRAND } from "@/lib/constants";
import { formatCurrency } from "@/lib/delivery";
import { normalizePhone } from "@/lib/storefront";
import { getUnitPrice } from "@/lib/pricing";
import {
  getBookableDates,
  getSlotsForBookableDate,
} from "@/lib/customer-delivery-slots";
import type { CouponType, DeliverySlot, Product } from "@/lib/types";
import { formatRazorpayPaymentError } from "@/lib/razorpay-errors";
import "@/lib/razorpay-checkout";

const STEPS = ["Details", "Verify & pay"];

type PublicCoupon = {
  code: string;
  type: CouponType;
  value_inr: number;
  min_subtotal_inr: number;
  first_order_only: boolean;
};

type PlacedOrder = {
  order_id: string;
  order_number: string;
  total_inr: number;
  phone: string;
  razorpay_order_id: string | null;
  razorpay_key: string | null;
};

export function DeliveryCheckoutClient({
  initialSlots,
  storeOpen,
}: {
  initialSlots: DeliverySlot[];
  storeOpen: boolean;
}) {
  const router = useRouter();
  const { items, clearCart, itemCount, pruneItems } = useCart();
  const {
    session,
    sessionReady,
    isLocationReady,
    setAddress,
    setCustomer,
    setPhoneVerified,
    clearSession,
  } = useDeliverySession();

  const [step, setStep] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [bookableSlots, setBookableSlots] = useState(initialSlots);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState<PublicCoupon[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState("");
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");
  const completingOrderRef = useRef(false);

  useEffect(() => {
    if (!sessionReady || completingOrderRef.current || placingOrder) return;
    if (!isLocationReady) router.replace("/orders/delivery");
    else if (itemCount === 0) router.replace("/orders/delivery/cart");
  }, [sessionReady, isLocationReady, itemCount, placingOrder, router]);

  useEffect(() => {
    setAppliedCoupon(readAppliedCoupon());
  }, []);

  useEffect(() => {
    fetch("/api/coupons")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAvailableCoupons(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ids = items.map((i) => i.productId);
    if (!ids.length) return;
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data: Product[]) => {
        setProducts(data);
        pruneItems(data.filter(isMenuProduct).map((p) => p.id));
      });
  }, [items, pruneItems]);

  useEffect(() => {
    fetch("/api/delivery/slots")
      .then((r) => r.json())
      .then(setBookableSlots)
      .catch(() => setBookableSlots(initialSlots));
  }, [initialSlots]);

  useEffect(() => {
    setOtp("");
    setOtpSent(false);
    setOtpHint("");
    setWhatsappVerified(false);
  }, [session.phone]);

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

  const validateDetails = () => {
    const errors: Record<string, string> = {};
    if (session.customerName.trim().length < 2) {
      errors.customerName = "Enter your full name";
    }
    if (!isValidIndianPhone(session.phone)) {
      errors.phone = "Enter a valid 10-digit WhatsApp number";
    }
    if (!session.house.trim()) errors.house = "House / flat number is required";
    if (!session.street.trim()) errors.street = "Street / area is required";
    if (!isValidIndianPincode(session.pincode)) {
      errors.pincode = "Enter a valid 6-digit pincode";
    }
    if (!selectedSlotId) errors.slot = "Choose a delivery date and time slot";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const applyCoupon = async (code?: string) => {
    const nextCode = (code ?? couponCode).toUpperCase().trim();
    if (!nextCode) return;
    setApplyingCoupon(true);
    setCouponMessage("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: nextCode,
          phone: session.phone,
          subtotal,
          delivery_fee_inr: session.delivery?.delivery_fee_inr ?? 0,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        const next: AppliedCoupon = {
          code: nextCode,
          discount_inr: data.discount_inr,
          free_delivery: data.free_delivery,
        };
        setAppliedCoupon(next);
        writeAppliedCoupon(next);
        setCouponCode(nextCode);
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

  const sendOtp = async () => {
    if (!isValidIndianPhone(session.phone)) {
      setError("Enter a valid WhatsApp number before requesting OTP");
      return false;
    }
    setSendingOtp(true);
    setError("");
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: session.phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send OTP");
        return false;
      }
      setOtpSent(true);
      setOtpHint(
        data.debug_otp
          ? `Demo OTP: ${data.debug_otp}`
          : "OTP sent to your WhatsApp number"
      );
      return true;
    } catch {
      setError("Could not send OTP");
      return false;
    } finally {
      setSendingOtp(false);
    }
  };

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
      razorpay_order_id: (data.razorpay_order_id as string | null) ?? null,
      razorpay_key: (data.razorpay_key as string | null) ?? null,
    } satisfies PlacedOrder;
  };

  const finishOrder = (orderNumber: string, phone: string) => {
    completingOrderRef.current = true;
    router.push(`/order/${orderNumber}?phone=${encodeURIComponent(phone)}`);
    clearCart();
    clearSession();
    writeAppliedCoupon(null);
  };

  const openRazorpayCheckout = (placed: PlacedOrder) =>
    new Promise<void>((resolve, reject) => {
      if (!placed.razorpay_order_id || !placed.razorpay_key) {
        reject(new Error("Payment is not configured. Contact support."));
        return;
      }
      if (!window.Razorpay) {
        reject(new Error("Payment is still loading. Please wait and try again."));
        return;
      }

      const rzp = new window.Razorpay({
        key: placed.razorpay_key,
        amount: placed.total_inr * 100,
        currency: "INR",
        name: BRAND.name,
        description: `Order ${placed.order_number}`,
        image: "/logo.png",
        order_id: placed.razorpay_order_id,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: placed.order_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed");
            }
            finishOrder(placed.order_number, placed.phone);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        prefill: {
          name: session.customerName.trim(),
          contact: `+91${placed.phone}`,
        },
        theme: { color: BRAND.colors.chocolate },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
      });

      rzp.on("payment.failed", (response) => {
        reject(new Error(formatRazorpayPaymentError(response.error)));
      });
      rzp.open();
    });

  const continueToVerification = async () => {
    setError("");
    if (!validateDetails()) return;
    setStep(1);
    if (!otpSent) await sendOtp();
  };

  const verifyWhatsappOtp = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit WhatsApp OTP");
      return;
    }
    setVerifyingOtp(true);
    setError("");
    try {
      const verifyRes = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: session.phone, code: otp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Invalid WhatsApp OTP");
      }
      setPhoneVerified(true);
      setWhatsappVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify WhatsApp number");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const payWithRazorpay = async () => {
    if (!whatsappVerified) {
      setError("Verify your WhatsApp number first");
      return;
    }
    setPlacingOrder(true);
    setError("");
    try {
      const placed = await createOrder();

      if (placed.razorpay_order_id && placed.razorpay_key) {
        await openRazorpayCheckout(placed);
        return;
      }

      finishOrder(placed.order_number, placed.phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete payment");
      setPlacingOrder(false);
    }
  };

  if (
    !sessionReady ||
    (!completingOrderRef.current && (!isLocationReady || itemCount === 0))
  ) {
    return null;
  }

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
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
      />
      <OrderFlowHeader title="Checkout" backHref="/orders/delivery/cart" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <div className="flex gap-1">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-chocolate" : "bg-chocolate/10"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="mt-6 space-y-4">
            <section className="rounded-2xl bg-white p-4 ring-1 ring-chocolate/10">
              <h2 className="text-sm font-medium text-chocolate">Your order</h2>
              <ul className="mt-3 space-y-3">
                {cartLines.map((line) => (
                  <li key={line.productId} className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                      {line.product.image_path ? (
                        <Image
                          src={line.product.image_path}
                          alt={line.product.title}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-chocolate">
                        {line.product.title}
                      </p>
                      <p className="text-xs text-chocolate/55">
                        Qty {line.quantity} · {formatCurrency(line.unitPrice)} each
                      </p>
                    </div>
                    <p className="text-sm font-medium text-chocolate">
                      {formatCurrency(line.lineTotal)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <div>
              <h2 className="font-display text-lg font-semibold text-chocolate">
                Delivery details
              </h2>
              <p className="mt-1 text-sm text-chocolate/60">
                Confirm address for your pinned map location.
              </p>
            </div>

            <div>
              <label className="text-xs text-chocolate/55">Full name</label>
              <input
                value={session.customerName}
                onChange={(e) => setCustomer({ customerName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
              />
              {fieldErrors.customerName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.customerName}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-chocolate/55">WhatsApp number</label>
              <div className="mt-1 flex overflow-hidden rounded-xl border border-chocolate/10 bg-white focus-within:border-chocolate/30">
                <span className="flex items-center bg-cream px-3 text-sm font-medium text-chocolate/70">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={session.phone}
                  onChange={(e) =>
                    setCustomer({ phone: formatIndianPhoneInput(e.target.value) })
                  }
                  placeholder="9876543210"
                  className="min-w-0 flex-1 px-3 py-3 text-sm outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-chocolate/50">
                Order updates and OTP will be sent to this WhatsApp number
              </p>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-chocolate/55">House / Flat no.</label>
              <input
                value={session.house}
                onChange={(e) => setAddress({ house: e.target.value })}
                className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
              />
              {fieldErrors.house && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.house}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-chocolate/55">Street / Area</label>
              <input
                value={session.street}
                onChange={(e) => setAddress({ street: e.target.value })}
                className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
              />
              {fieldErrors.street && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.street}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-chocolate/55">Landmark (optional)</label>
              <input
                value={session.landmark}
                onChange={(e) => setAddress({ landmark: e.target.value })}
                className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
              />
            </div>

            <div>
              <label className="text-xs text-chocolate/55">Pincode</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={session.pincode}
                onChange={(e) => setAddress({ pincode: formatPincodeInput(e.target.value) })}
                placeholder="560001"
                className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
              />
              {fieldErrors.pincode && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.pincode}</p>
              )}
            </div>

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
                      {slot.window_start.slice(0, 5)} – {slot.window_end.slice(0, 5)}
                    </span>
                    {selectedSlotId === slot.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
            {fieldErrors.slot && (
              <p className="text-xs text-red-600">{fieldErrors.slot}</p>
            )}

            <section className="rounded-2xl bg-white p-4 ring-1 ring-chocolate/10">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-gold" />
                <h3 className="text-sm font-medium text-chocolate">Coupon codes</h3>
              </div>
              {availableCoupons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableCoupons.map((coupon) => (
                    <button
                      key={coupon.code}
                      type="button"
                      disabled={applyingCoupon || appliedCoupon?.code === coupon.code}
                      onClick={() => applyCoupon(coupon.code)}
                      className={`rounded-full px-3 py-1.5 text-left text-xs ring-1 transition ${
                        appliedCoupon?.code === coupon.code
                          ? "bg-green-50 text-green-800 ring-green-200"
                          : "bg-cream text-chocolate ring-chocolate/10 hover:ring-chocolate/25"
                      }`}
                    >
                      <span className="font-semibold">{coupon.code}</span>
                      <span className="ml-1 text-chocolate/60">
                        · {describeCoupon(coupon)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {appliedCoupon ? (
                <div className="mt-3 flex items-center justify-between gap-2">
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
                <div className="mt-3 flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 rounded-xl border border-chocolate/10 bg-cream px-3 py-2.5 text-sm uppercase outline-none focus:border-chocolate/30"
                  />
                  <button
                    type="button"
                    onClick={() => applyCoupon()}
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
            </section>

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
              onClick={continueToVerification}
              className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream"
            >
              Continue to WhatsApp verification
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-chocolate">
              Verify & pay
            </h2>

            {!whatsappVerified ? (
              <>
                <p className="text-sm text-chocolate/60">
                  Step 1 — Enter the WhatsApp OTP sent to +91 {session.phone}
                </p>

                {otpHint && (
                  <p className="rounded-xl bg-gold/15 px-3 py-2 text-xs text-chocolate">
                    {otpHint}
                  </p>
                )}

                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="WhatsApp OTP"
                  className="w-full rounded-xl border border-chocolate/10 bg-white px-3 py-4 text-center text-2xl tracking-[0.4em] outline-none focus:border-chocolate/30"
                />

                <button
                  type="button"
                  disabled={sendingOtp}
                  onClick={sendOtp}
                  className="text-sm text-chocolate/70 underline"
                >
                  {sendingOtp ? "Sending..." : "Resend WhatsApp OTP"}
                </button>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(0);
                      setError("");
                    }}
                    className="flex-1 rounded-full border border-chocolate/20 py-4 text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={otp.length !== 6 || verifyingOtp}
                    onClick={verifyWhatsappOtp}
                    className="flex-1 rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
                  >
                    {verifyingOtp ? "Verifying..." : "Verify WhatsApp"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">
                  WhatsApp number verified
                </p>

                <p className="text-sm text-chocolate/60">
                  Step 2 — Pay securely with Razorpay
                </p>

                <div className="rounded-xl bg-cream px-3 py-3 text-xs leading-relaxed text-chocolate/70 ring-1 ring-chocolate/10">
                  <p className="font-medium text-chocolate">Test payment (Razorpay test mode)</p>
                  <p className="mt-1">
                    Card: <strong>4111 1111 1111 1111</strong> · any future expiry · any CVV
                  </p>
                  <p className="mt-1">
                    On Razorpay&apos;s bank OTP screen, enter a new 6-digit code (e.g.{" "}
                    <strong>123456</strong>) — not the WhatsApp OTP above.
                  </p>
                </div>

                {!razorpayReady && (
                  <p className="text-xs text-chocolate/50">Loading secure payment...</p>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-chocolate/10">
                  <p className="text-chocolate/60">Amount to pay</p>
                  <p className="mt-1 text-2xl font-semibold text-chocolate">
                    {formatCurrency(total)}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappVerified(false);
                      setPhoneVerified(false);
                      setError("");
                    }}
                    className="flex-1 rounded-full border border-chocolate/20 py-4 text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={placingOrder || !razorpayReady}
                    onClick={payWithRazorpay}
                    className="flex-1 rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
                  >
                    {placingOrder ? "Processing..." : `Pay ${formatCurrency(total)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
