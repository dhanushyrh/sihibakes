"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import { CheckCircle2, Tag } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { SelectedLocationMap } from "@/components/store/SelectedLocationMap";
import { DeliverySlotSelects } from "@/components/store/DeliverySlotSelects";
import { AvailableCouponsPicker } from "@/components/store/AvailableCouponsPicker";
import { IndianPhoneInput } from "@/components/store/IndianPhoneInput";
import { useCart } from "@/components/store/CartProvider";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import { useCustomerPrefill } from "@/hooks/useCustomerPrefill";
import {
  readAppliedCoupon,
  writeAppliedCoupon,
  type AppliedCoupon,
} from "@/lib/applied-coupon";
import {
  formatPincodeInput,
  isValidEmail,
  isValidIndianPhone,
  isValidIndianPincode,
  normalizeEmail,
} from "@/lib/checkout-validation";
import { isMenuProduct } from "@/lib/cart-products";
import { CHECKOUT_LOCATION_PATH } from "@/lib/checkout-routing";
import { scrollToFirstCheckoutError } from "@/lib/scroll";
import { BRAND } from "@/lib/constants";
import { formatCurrency, formatDistance } from "@/lib/delivery";
import { normalizePhone } from "@/lib/storefront";
import { getUnitPrice } from "@/lib/pricing";
import {
  filterSlotsForDeliveryMode,
  resolveDeliverySelection,
  type DeliveryMode,
} from "@/lib/customer-delivery-slots";
import type { DeliveryCalculation, DeliveryFenceKm, DeliverySlot, Product } from "@/lib/types";
import type { PublicCoupon } from "@/lib/public-coupons";
import { filterEligiblePublicCoupons } from "@/lib/public-coupons";
import { buildRazorpayCheckoutOptions } from "@/lib/razorpay";
import {
  formatRazorpayPaymentError,
  formatRazorpayVerifyError,
} from "@/lib/razorpay-errors";
import {
  getActivitySessionIdForOrder,
  trackActivity,
  clearActivitySessionId,
} from "@/lib/activity-tracker";
import { OrderFlowLoading } from "@/components/store/OrderFlowLoading";
import { Spinner } from "@/components/ui/Spinner";

type PlacedOrder = {
  order_id: string;
  order_number: string;
  total_inr: number;
  phone: string;
  payment_skip_enabled: boolean;
  razorpay_order_id: string | null;
  razorpay_key: string | null;
};

export function DeliveryCheckoutClient({
  initialSlots,
  storeOpen,
  kitchenLat,
  kitchenLng,
  deliveryFence,
  paymentSkipEnabled,
}: {
  initialSlots: DeliverySlot[];
  storeOpen: boolean;
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
  paymentSkipEnabled: boolean;
}) {
  const router = useRouter();
  const { items, clearCart, itemCount, pruneItems } = useCart();
  const {
    session,
    sessionReady,
    isLocationReady,
    isDeliveryModeReady,
    setAddress,
    setCustomer,
    setPhoneVerified,
    setLocation,
    setDeliverySchedule,
    clearSession,
  } = useDeliverySession();

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
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(false);
  const [error, setError] = useState("");
  const completingOrderRef = useRef(false);
  const checkoutTrackedRef = useRef(false);
  const lastDeliveryQuoteKeyRef = useRef<string | null>(null);

  const phoneVerified =
    session.phoneVerified && isValidIndianPhone(session.whatsappPhone);

  // next/script only fires onLoad once per full page load. On client-side
  // navigation the checkout.js tag is already present and onLoad never fires,
  // so poll for window.Razorpay to unblock the pay button.
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

  const fieldInputClass = (hasError: boolean) =>
    `mt-1 w-full rounded-xl border bg-white px-3 py-3 text-base outline-none focus:border-chocolate/30 ${
      hasError ? "border-red-300" : "border-chocolate/10"
    }`;

  const { isFirstOrder, prefillNote, ready: customerLookupReady } =
    useCustomerPrefill(session.whatsappPhone, phoneVerified);

  useEffect(() => {
    if (
      !sessionReady ||
      completingOrderRef.current ||
      completingOrder ||
      placingOrder
    ) {
      return;
    }
    if (itemCount === 0) router.replace("/orders/delivery/cart");
  }, [sessionReady, itemCount, placingOrder, completingOrder, router]);

  useEffect(() => {
    if (!sessionReady || completingOrder || completingOrderRef.current || placingOrder) {
      return;
    }
    if (!isDeliveryModeReady) {
      router.replace("/orders/delivery");
      return;
    }
    if (!phoneVerified) {
      router.replace("/orders/delivery/cart?auth=1");
      return;
    }
    if (!isLocationReady) {
      router.replace(CHECKOUT_LOCATION_PATH);
    }
  }, [
    sessionReady,
    isDeliveryModeReady,
    phoneVerified,
    isLocationReady,
    placingOrder,
    completingOrder,
    router,
  ]);

  const deliveryMode = session.deliveryMode as DeliveryMode | null;

  const modeSlots = useMemo(() => {
    if (!deliveryMode) return bookableSlots;
    return filterSlotsForDeliveryMode(bookableSlots, deliveryMode);
  }, [bookableSlots, deliveryMode]);

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
    const inventoryDate = selectedDate || session.deliveryDate;
    if (!ids.length || !inventoryDate) return;
    const params = new URLSearchParams({
      ids: ids.join(","),
      delivery_date: inventoryDate,
    });
    if (deliveryMode) {
      params.set("delivery_mode", deliveryMode);
    }
    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((data: Product[]) => {
        setProducts(data);
        pruneItems(data.filter(isMenuProduct).map((p) => p.id));
      });
  }, [items, selectedDate, session.deliveryDate, deliveryMode, pruneItems]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (deliveryMode) {
      setDeliverySchedule(deliveryMode, date);
    }
  };

  useEffect(() => {
    fetch("/api/delivery/slots")
      .then((r) => r.json())
      .then(setBookableSlots)
      .catch(() => setBookableSlots(initialSlots));
  }, [initialSlots]);

  useEffect(() => {
    if (!modeSlots.length) return;
    const next = resolveDeliverySelection(modeSlots, {
      date: selectedDate,
      slotId: selectedSlotId,
    });
    if (next.date !== selectedDate) setSelectedDate(next.date);
    if (next.slotId !== selectedSlotId) setSelectedSlotId(next.slotId);
  }, [modeSlots, selectedDate, selectedSlotId]);

  useEffect(() => {
    if (!deliveryMode || !selectedDate) return;
    if (session.deliveryDate !== selectedDate) {
      setDeliverySchedule(deliveryMode, selectedDate);
    }
  }, [deliveryMode, selectedDate, session.deliveryDate, setDeliverySchedule]);

  const selectedSlot = useMemo(
    () => modeSlots.find((slot) => slot.id === selectedSlotId) ?? null,
    [modeSlots, selectedSlotId]
  );

  useEffect(() => {
    if (session.lat == null || session.lng == null || !selectedSlot) return;

    const quoteKey = [
      session.lat,
      session.lng,
      selectedSlot.id,
      selectedSlot.slot_date,
      selectedSlot.window_start,
      selectedSlot.window_end,
    ].join("|");

    if (lastDeliveryQuoteKeyRef.current === quoteKey) return;

    let cancelled = false;
    void fetch("/api/delivery/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: session.lat,
        lng: session.lng,
        delivery_date: selectedSlot.slot_date,
        window_start: selectedSlot.window_start,
        window_end: selectedSlot.window_end,
      }),
    })
      .then((res) => res.json())
      .then((data: DeliveryCalculation) => {
        if (!cancelled) {
          lastDeliveryQuoteKeyRef.current = quoteKey;
          setLocation(session.lat!, session.lng!, data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedSlot, session.lat, session.lng, setLocation]);

  useEffect(() => {
    if (!customerLookupReady || isFirstOrder || !appliedCoupon) return;
    if (
      availableCoupons.some(
        (c) => c.code === appliedCoupon.code && c.first_order_only
      )
    ) {
      setAppliedCoupon(null);
      writeAppliedCoupon(null);
      setCouponCode("");
      setCouponMessage("That coupon is valid for first orders only");
    }
  }, [customerLookupReady, isFirstOrder, appliedCoupon, availableCoupons]);

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

  const eligibleCoupons = useMemo(
    () =>
      filterEligiblePublicCoupons(availableCoupons, {
        subtotal,
        isFirstOrder,
        checkFirstOrder: customerLookupReady,
      }),
    [availableCoupons, subtotal, isFirstOrder, customerLookupReady]
  );

  useEffect(() => {
    if (!appliedCoupon) return;
    const meta = availableCoupons.find((c) => c.code === appliedCoupon.code);
    if (!meta) return;
    if (subtotal < meta.min_subtotal_inr) {
      setAppliedCoupon(null);
      writeAppliedCoupon(null);
      setCouponCode("");
      setCouponMessage(
        `Minimum order of ₹${meta.min_subtotal_inr} required for ${meta.code}`
      );
    }
  }, [subtotal, appliedCoupon, availableCoupons]);

  const deliveryFee = appliedCoupon?.free_delivery
    ? 0
    : (session.delivery?.delivery_fee_inr ?? 0);
  const couponDiscount = appliedCoupon?.discount_inr ?? 0;
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);

  useEffect(() => {
    if (
      checkoutTrackedRef.current ||
      !sessionReady ||
      !phoneVerified ||
      !isLocationReady ||
      itemCount === 0 ||
      session.lat == null ||
      session.lng == null
    ) {
      return;
    }

    checkoutTrackedRef.current = true;
    trackActivity("checkout_started", "checkout", {
      phone: session.whatsappPhone,
      fullName: session.customerName.trim(),
      email: normalizeEmail(session.email),
      lat: session.lat,
      lng: session.lng,
      deliveryDistanceKm: session.delivery?.distance_km,
      deliveryFeeInr: session.delivery?.delivery_fee_inr,
      cartValueInr: total,
      itemCount,
      cartItems: cartLines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        title: line.product.title,
        unitPriceInr: line.unitPrice,
        lineTotalInr: line.lineTotal,
      })),
    });
  }, [
    sessionReady,
    phoneVerified,
    isLocationReady,
    itemCount,
    session.lat,
    session.lng,
    session.delivery,
    session.whatsappPhone,
    session.customerName,
    session.email,
    total,
    cartLines,
  ]);

  const validateDetails = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (session.customerName.trim().length < 2) {
      errors.customerName = "Enter your full name";
    }
    if (!isValidEmail(session.email)) {
      errors.email = "Enter a valid email address";
    }
    if (!isValidIndianPhone(session.whatsappPhone)) {
      errors.whatsappPhone = "Enter a valid 10-digit WhatsApp number";
    }
    if (session.altPhone.trim()) {
      if (!isValidIndianPhone(session.altPhone)) {
        errors.altPhone = "Enter a valid 10-digit alternate number";
      } else if (session.altPhone === session.whatsappPhone) {
        errors.altPhone = "Must be different from your WhatsApp number";
      }
    }
    if (!session.house.trim()) errors.house = "House / flat number is required";
    if (!session.street.trim()) errors.street = "Street / area is required";
    if (!isValidIndianPincode(session.pincode)) {
      errors.pincode = "Enter a valid 6-digit pincode";
    }
    if (!selectedSlotId) errors.slot = "Choose a delivery date and time slot";
    if (!isLocationReady) {
      errors.location = "Set your delivery location before paying";
    }
    setFieldErrors(errors);
    return errors;
  };

  const applyCoupon = async (code?: string) => {
    const nextCode = (code ?? couponCode).toUpperCase().trim();
    if (!nextCode) return;

    const couponMeta = availableCoupons.find((c) => c.code === nextCode);
    if (
      couponMeta?.first_order_only &&
      customerLookupReady &&
      !isFirstOrder
    ) {
      setCouponMessage("Valid for first order only");
      return;
    }
    if (couponMeta?.first_order_only && !customerLookupReady) {
      setCouponMessage("Checking coupon eligibility…");
      return;
    }

    setApplyingCoupon(true);
    setCouponMessage("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: nextCode,
          phone: session.whatsappPhone,
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

  const useDifferentNumber = () => {
    setCustomer({ whatsappPhone: "" });
    setPhoneVerified(false);
    router.replace("/orders/delivery/cart?auth=1");
  };

  const createOrder = async () => {
    const phone = normalizePhone(session.whatsappPhone.trim());
    const altPhone = session.altPhone.trim()
      ? normalizePhone(session.altPhone.trim())
      : "";
    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        customer_name: session.customerName.trim(),
        phone,
        email: normalizeEmail(session.email),
        alt_phone: altPhone || undefined,
        house: session.house.trim(),
        street: session.street.trim(),
        landmark: session.landmark.trim() || undefined,
        pincode: session.pincode.trim(),
        delivery_lat: session.lat,
        delivery_lng: session.lng,
        delivery_slot_id: selectedSlotId,
        delivery_mode: session.deliveryMode ?? undefined,
        coupon_code: appliedCoupon?.code || undefined,
        activity_session_id: getActivitySessionIdForOrder(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const message = data.error || "Order failed";
      if (message.toLowerCase().includes("verify your phone")) {
        setPhoneVerified(false);
        router.replace("/orders/delivery/cart?auth=1");
      }
      throw new Error(message);
    }
    return {
      order_id: data.order_id as string,
      order_number: data.order_number as string,
      total_inr: data.total_inr as number,
      phone,
      payment_skip_enabled: Boolean(data.payment_skip_enabled),
      razorpay_order_id: (data.razorpay_order_id as string | null) ?? null,
      razorpay_key: (data.razorpay_key as string | null) ?? null,
    } satisfies PlacedOrder;
  };

  const completeSkipPayment = async (order: {
    order_id: string;
    order_number: string;
    phone: string;
  }) => {
    const res = await fetch("/api/orders/skip-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.order_id,
        order_number: order.order_number,
        phone: order.phone,
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      whatsapp_sent?: boolean;
    };
    if (!res.ok) {
      throw new Error(data.error || "Could not confirm order");
    }
    return data;
  };

  const finishOrder = (orderNumber: string, phone: string) => {
    completingOrderRef.current = true;
    setCompletingOrder(true);
    clearActivitySessionId();
    router.replace(`/order/${orderNumber}?phone=${encodeURIComponent(phone)}`);
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
        ...buildRazorpayCheckoutOptions({
          key: placed.razorpay_key,
          orderId: placed.razorpay_order_id,
          name: BRAND.name,
          description: `Order ${placed.order_number}`,
          themeColor: BRAND.colors.chocolate,
          prefill: {
            name: session.customerName.trim(),
            contact: `+91${placed.phone}`,
            email: normalizeEmail(session.email),
          },
        }),
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
              throw new Error(
                formatRazorpayVerifyError(verifyData.error, verifyData.code)
              );
            }
            finishOrder(placed.order_number, placed.phone);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
      });

      rzp.on("payment.failed", (response) => {
        reject(new Error(formatRazorpayPaymentError(response.error)));
      });
      rzp.open();
    });

  const payWithRazorpay = async () => {
    setError("");
    if (!isLocationReady) {
      router.push(CHECKOUT_LOCATION_PATH);
      return;
    }
    const errors = validateDetails();
    if (Object.keys(errors).length > 0) {
      if (errors.location) {
        router.push(CHECKOUT_LOCATION_PATH);
        return;
      }
      requestAnimationFrame(() => scrollToFirstCheckoutError(errors));
      return;
    }
    if (!phoneVerified) {
      router.replace("/orders/delivery/cart?auth=1");
      return;
    }

    setPlacingOrder(true);
    try {
      const placed = await createOrder();
      const skipPayment = placed.payment_skip_enabled || paymentSkipEnabled;

      if (skipPayment) {
        await completeSkipPayment(placed);
        finishOrder(placed.order_number, placed.phone);
        return;
      }

      if (!placed.razorpay_order_id || !placed.razorpay_key) {
        throw new Error("Payment is not configured. Contact support.");
      }

      await openRazorpayCheckout(placed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete payment");
      setPlacingOrder(false);
    }
  };

  if (completingOrder || completingOrderRef.current) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
        <Spinner size="lg" label="Completing your order" />
        <p className="mt-3 text-sm text-chocolate/60">Completing your order…</p>
      </div>
    );
  }

  if (
    !sessionReady ||
    !isDeliveryModeReady ||
    itemCount === 0 ||
    !phoneVerified ||
    !isLocationReady
  ) {
    return <OrderFlowLoading />;
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
    <div className="flex min-h-screen flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
        onReady={() => setRazorpayReady(true)}
      />
      <OrderFlowHeader title="Checkout" backHref="/orders/delivery/cart" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-chocolate">
              Review your order
            </h2>
            <p className="mt-1 text-sm text-chocolate/60">
              Confirm your details and pay securely.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-green-50 px-4 py-3 ring-1 ring-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-green-700" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  +91 {session.whatsappPhone}
                </p>
                <p className="text-xs text-green-700">WhatsApp verified</p>
              </div>
            </div>
            <button
              type="button"
              onClick={useDifferentNumber}
              className="shrink-0 text-xs text-green-800 underline"
            >
              Change
            </button>
          </div>

          {prefillNote && (
            <p className="text-xs text-green-700">{prefillNote}</p>
          )}

          <section className="rounded-2xl bg-white p-4 ring-1 ring-chocolate/10">
            <h3 className="text-sm font-medium text-chocolate">Your details</h3>
            <div className="mt-3 space-y-3">
              <div
                className="scroll-mt-24"
                data-checkout-field="customerName"
              >
                <label className="text-xs text-chocolate/55">Full name</label>
                <input
                  value={session.customerName}
                  onChange={(e) => setCustomer({ customerName: e.target.value })}
                  aria-invalid={!!fieldErrors.customerName}
                  className={fieldInputClass(!!fieldErrors.customerName)}
                />
                {fieldErrors.customerName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.customerName}</p>
                )}
              </div>

              <div className="scroll-mt-24" data-checkout-field="email">
                <label className="text-xs text-chocolate/55">Email address</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={session.email}
                  onChange={(e) => setCustomer({ email: e.target.value })}
                  placeholder="you@example.com"
                  aria-invalid={!!fieldErrors.email}
                  className={fieldInputClass(!!fieldErrors.email)}
                />
                <p className="mt-1 text-xs text-chocolate/50">
                  Order confirmation and receipts
                </p>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div className="scroll-mt-24" data-checkout-field="altPhone">
                <label className="text-xs text-chocolate/55">
                  Alternate contact number
                </label>
                <IndianPhoneInput
                  value={session.altPhone}
                  onChange={(value) => setCustomer({ altPhone: value })}
                  autoComplete="tel"
                  placeholder="Optional backup number"
                  invalid={!!fieldErrors.altPhone}
                />
                <p className="mt-1 text-xs text-chocolate/50">
                  Optional — someone else we can call if needed
                </p>
                {fieldErrors.altPhone && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.altPhone}</p>
                )}
              </div>
            </div>
          </section>

          <section
            className="scroll-mt-24 overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-chocolate/10"
            data-checkout-field="location"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-chocolate">Delivery</h3>
              <button
                type="button"
                onClick={() => router.push(CHECKOUT_LOCATION_PATH)}
                className="text-xs text-chocolate/60 underline"
              >
                Edit location
              </button>
            </div>
            {session.lat != null && session.lng != null && (
              <SelectedLocationMap
                lat={session.lat}
                lng={session.lng}
                kitchenLat={kitchenLat}
                kitchenLng={kitchenLng}
                deliveryFence={deliveryFence}
                variant="preview"
                onEdit={() => router.push(CHECKOUT_LOCATION_PATH)}
              />
            )}
            {session.delivery?.reachable && (
              <p className="mt-2 text-center text-xs text-chocolate/55">
                {formatDistance(session.delivery.distance_km)} away · Delivery fee{" "}
                {formatCurrency(session.delivery.delivery_fee_inr)}
              </p>
            )}
            {fieldErrors.location && (
              <p className="mt-2 text-xs text-red-600">{fieldErrors.location}</p>
            )}

            <p className="mt-4 text-xs text-chocolate/45">
              Address for your pinned location
            </p>

            <div className="mt-3 space-y-3">
              <div className="scroll-mt-24" data-checkout-field="house">
                <label className="text-xs text-chocolate/55">House / Flat no.</label>
                <input
                  value={session.house}
                  onChange={(e) => setAddress({ house: e.target.value })}
                  aria-invalid={!!fieldErrors.house}
                  className={fieldInputClass(!!fieldErrors.house)}
                />
                {fieldErrors.house && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.house}</p>
                )}
              </div>

              <div className="scroll-mt-24" data-checkout-field="street">
                <label className="text-xs text-chocolate/55">Street / Area</label>
                <input
                  value={session.street}
                  onChange={(e) => setAddress({ street: e.target.value })}
                  aria-invalid={!!fieldErrors.street}
                  className={fieldInputClass(!!fieldErrors.street)}
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
                  className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-base outline-none focus:border-chocolate/30"
                />
              </div>

              <div className="scroll-mt-24" data-checkout-field="pincode">
                <label className="text-xs text-chocolate/55">Pincode</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  value={session.pincode}
                  onChange={(e) =>
                    setAddress({ pincode: formatPincodeInput(e.target.value) })
                  }
                  placeholder="560001"
                  aria-invalid={!!fieldErrors.pincode}
                  className={fieldInputClass(!!fieldErrors.pincode)}
                />
                {fieldErrors.pincode && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.pincode}</p>
                )}
              </div>
            </div>
          </section>

          <div className="scroll-mt-24" data-checkout-field="slot">
            <DeliverySlotSelects
              slots={modeSlots}
              selectedDate={selectedDate}
              selectedSlotId={selectedSlotId}
              onDateChange={handleDateChange}
              onSlotChange={setSelectedSlotId}
              deliveryMode={deliveryMode}
              slotError={fieldErrors.slot}
            />
          </div>

          <section className="rounded-2xl bg-white p-4 ring-1 ring-chocolate/10">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-gold" />
              <h3 className="text-sm font-medium text-chocolate">Coupon codes</h3>
            </div>
            {!appliedCoupon && eligibleCoupons.length > 0 && (
              <AvailableCouponsPicker
                coupons={eligibleCoupons}
                applyingCoupon={applyingCoupon}
                onApply={applyCoupon}
              />
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
                  className="min-w-0 flex-1 rounded-xl border border-chocolate/10 bg-cream px-3 py-2.5 text-base uppercase outline-none focus:border-chocolate/30"
                />
                <button
                  type="button"
                  onClick={() => applyCoupon()}
                  disabled={applyingCoupon || !couponCode.trim()}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-chocolate px-4 py-2.5 text-sm font-medium text-cream disabled:opacity-40"
                >
                  {applyingCoupon ? (
                    <>
                      <Spinner size="sm" className="!text-cream/80" label="Applying coupon" />
                      <span>Applying…</span>
                    </>
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>
            )}
            {couponMessage && !appliedCoupon && (
              <p className="mt-2 text-xs text-red-600">{couponMessage}</p>
            )}
          </section>

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

          {paymentSkipEnabled && (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-900 ring-1 ring-amber-200">
              Payment bypass is on — orders will be placed without Razorpay. Turn
              this off in Admin → Settings before going live.
            </p>
          )}

          {!paymentSkipEnabled && !razorpayReady && (
            <div className="flex items-center gap-2 text-xs text-chocolate/50">
              <Spinner size="sm" label="Loading secure payment" />
              <span>Loading secure payment…</span>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-chocolate/10 bg-cream/95 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={placingOrder || (!paymentSkipEnabled && !razorpayReady)}
            onClick={() => void payWithRazorpay()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream disabled:opacity-40"
          >
            {placingOrder ? (
              <>
                <Spinner size="sm" className="!text-cream/80" label="Processing payment" />
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
    </div>
  );
}
