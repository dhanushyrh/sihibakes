import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProductsByIds,
  getShopSettings,
  isDeliveryDayClosed,
  isFirstOrder,
  checkProductAvailability,
} from "@/lib/data";
import { isValidIndianPhone, isValidIndianPincode, isValidEmail, normalizeEmail } from "@/lib/checkout-validation";
import { requireVerifiedPhoneWithConsent } from "@/lib/legal-consent";
import { resolveDeliveryQuote } from "@/lib/delivery-quote";
import {
  applyCoupon,
  calcOrderTotal,
  calcSubtotal,
  generateOrderNumber,
  getUnitPrice,
} from "@/lib/pricing";
import { createRazorpayOrder, getRazorpayPublicKey } from "@/lib/razorpay";
import { isSlotBookableWithLeadTime, isWithinOrderBookingWindow } from "@/lib/customer-delivery-slots";
import { getDeliveryFence, isWithinDeliveryFence } from "@/lib/delivery-fence";
import {
  markActivityOrderCreated,
} from "@/lib/customer-activity";
import { parseRequestClientInfo } from "@/lib/request-client-info";
import { isBorzoConfigured } from "@/lib/borzo/config";
import { formatCustomerAddress } from "@/lib/borzo/delivery";
import { buildBorzoQuoteSlotFromDeliverySlot } from "@/lib/borzo/quote-slot";
import { BorzoApiError, formatBorzoError } from "@/lib/borzo/client";
import type { Coupon, DeliverySlot } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      items,
      customer_name,
      phone,
      email,
      alt_phone,
      house,
      street,
      landmark,
      pincode,
      delivery_lat,
      delivery_lng,
      delivery_slot_id,
      coupon_code,
      activity_session_id,
    } = body;

    const settings = await getShopSettings();
    if (!settings?.orders_accepting) {
      return NextResponse.json(
        { error: "We are not accepting orders right now" },
        { status: 400 }
      );
    }

    if (!items?.length || !customer_name || !phone || !email || !house || !street || !pincode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(String(email));
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const normalizedPhone = String(phone).replace(/\D/g, "").slice(-10);
    if (!isValidIndianPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit WhatsApp number" },
        { status: 400 }
      );
    }

    const normalizedAltPhone = alt_phone
      ? String(alt_phone).replace(/\D/g, "").slice(-10)
      : "";
    if (normalizedAltPhone && !isValidIndianPhone(normalizedAltPhone)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit alternate contact number" },
        { status: 400 }
      );
    }
    if (normalizedAltPhone && normalizedAltPhone === normalizedPhone) {
      return NextResponse.json(
        { error: "Alternate contact must be different from your WhatsApp number" },
        { status: 400 }
      );
    }
    if (!isValidIndianPincode(String(pincode))) {
      return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
    }
    const phoneGuard = await requireVerifiedPhoneWithConsent(normalizedPhone);
    if (!phoneGuard.ok) {
      return NextResponse.json({ error: phoneGuard.error }, { status: phoneGuard.status });
    }

    const productIds = items.map((i: { productId: string }) => i.productId);

    const admin = createAdminClient();

    const { data: slot } = await admin
      .from("delivery_slots")
      .select("*")
      .eq("id", delivery_slot_id)
      .eq("is_active", true)
      .single();

    if (!slot) {
      return NextResponse.json({ error: "Invalid delivery slot" }, { status: 400 });
    }

    if (await isDeliveryDayClosed(slot.slot_date)) {
      return NextResponse.json(
        { error: "Store closed — deliveries are not available on the selected date" },
        { status: 400 }
      );
    }

    if (!isSlotBookableWithLeadTime(slot as DeliverySlot)) {
      return NextResponse.json(
        {
          error:
            "This delivery slot is no longer available — please choose a later time",
        },
        { status: 400 }
      );
    }

    if (!isWithinOrderBookingWindow(slot.slot_date)) {
      return NextResponse.json(
        { error: "Delivery is only available for the next 4 days" },
        { status: 400 }
      );
    }

    const products = await getProductsByIds(productIds, slot.slot_date);
    const cartItems = items
      .map((i: { productId: string; quantity: number }) => {
        const product = products.find((p) => p.id === i.productId);
        if (!product || !product.is_active || product.sold_out_today) return null;
        return { product, quantity: i.quantity };
      })
      .filter(Boolean) as { product: (typeof products)[0]; quantity: number }[];

    if (cartItems.length !== items.length) {
      return NextResponse.json(
        { error: "Some items are unavailable" },
        { status: 400 }
      );
    }

    const fence = getDeliveryFence(settings);

    if (
      !isWithinDeliveryFence(
        delivery_lat,
        delivery_lng,
        settings.kitchen_lat,
        settings.kitchen_lng,
        fence
      )
    ) {
      return NextResponse.json(
        { error: "Delivery location is out of range" },
        { status: 400 }
      );
    }

    for (const { product, quantity } of cartItems) {
      const avail = await checkProductAvailability(
        product.id,
        quantity,
        slot.slot_date
      );
      if (!avail.ok) {
        return NextResponse.json(
          { error: `${product.title}: ${avail.message}` },
          { status: 400 }
        );
      }
    }

    let deliveryQuote;
    try {
      deliveryQuote = await resolveDeliveryQuote({
        settings,
        customerLat: delivery_lat,
        customerLng: delivery_lng,
        customerAddress: formatCustomerAddress({
          house,
          street,
          landmark: landmark || null,
          pincode,
        }),
        borzoSlot: buildBorzoQuoteSlotFromDeliverySlot(slot as DeliverySlot),
      });
    } catch (err) {
      if (isBorzoConfigured()) {
        console.error("Borzo delivery quote failed during order create:", err);
        const message =
          err instanceof BorzoApiError
            ? formatBorzoError(err)
            : err instanceof Error
              ? err.message
              : "Could not calculate delivery fee";
        return NextResponse.json(
          { error: message },
          { status: err instanceof BorzoApiError && err.status < 500 ? 400 : 502 }
        );
      }
      throw err;
    }

    const { subtotal } = calcSubtotal(cartItems);

    let couponResult;
    let couponId: string | null = null;

    if (coupon_code) {
      const { data: coupon } = await admin
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase().trim())
        .single();

      if (coupon) {
        const firstOrder = await isFirstOrder(phone);
        couponResult = applyCoupon(
          coupon as Coupon,
          subtotal,
          deliveryQuote.delivery_fee_inr,
          firstOrder
        );
        if (!couponResult.valid) {
          return NextResponse.json({ error: couponResult.message }, { status: 400 });
        }
        couponId = coupon.id;
      }
    }

    const pricing = calcOrderTotal(
      cartItems,
      deliveryQuote.distance_km,
      [],
      couponResult,
      deliveryQuote.delivery_fee_inr
    );
    const orderNumber = generateOrderNumber();

    const { data: customer } = await admin
      .from("customers")
      .upsert(
        { name: customer_name, phone: normalizedPhone, email: normalizedEmail },
        { onConflict: "phone" }
      )
      .select("id")
      .single();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customer?.id ?? null,
        customer_name,
        phone: normalizedPhone,
        alt_phone: normalizedAltPhone,
        house,
        street,
        landmark: landmark || null,
        pincode,
        delivery_lat,
        delivery_lng,
        distance_km: deliveryQuote.distance_km,
        delivery_fee_inr: pricing.delivery_fee_inr,
        subtotal_inr: pricing.subtotal_inr,
        discount_inr: pricing.coupon_discount_inr,
        total_inr: pricing.total_inr,
        coupon_id: couponId,
        delivery_date: slot.slot_date,
        delivery_window_start: slot.window_start,
        delivery_window_end: slot.window_end,
        delivery_slot_id: slot.id,
        payment_status: "pending",
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const activityCartItems = cartItems.map(({ product, quantity }) => ({
      productId: product.id,
      quantity,
      title: product.title,
      unitPriceInr: Math.round(getUnitPrice(product)),
      lineTotalInr: Math.round(getUnitPrice(product) * quantity),
    }));

    void markActivityOrderCreated({
      activitySessionId:
        typeof activity_session_id === "string" ? activity_session_id : null,
      orderId: order.id,
      phone: normalizedPhone,
      fullName: customer_name,
      email: normalizedEmail,
      customerId: customer?.id ?? null,
      lat: delivery_lat,
      lng: delivery_lng,
      deliveryDistanceKm: deliveryQuote.distance_km,
      deliveryFeeInr: pricing.delivery_fee_inr,
      totalInr: pricing.total_inr,
      cartItems: activityCartItems,
      clientInfo: parseRequestClientInfo(request),
    });

    const orderItems = cartItems.map(({ product, quantity }) => ({
      order_id: order.id,
      product_id: product.id,
      quantity,
      unit_price_inr: Math.round(getUnitPrice(product)),
      line_total_inr: Math.round(getUnitPrice(product) * quantity),
    }));

    await admin.from("order_items").insert(orderItems);

    let razorpayOrderId: string | null = null;
    const razorpayKey = getRazorpayPublicKey();

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      if (razorpayKey && razorpayKey !== process.env.RAZORPAY_KEY_ID.trim()) {
        console.warn(
          "Razorpay key mismatch: NEXT_PUBLIC_RAZORPAY_KEY_ID should equal RAZORPAY_KEY_ID"
        );
      }
      try {
        const rzOrder = await createRazorpayOrder(pricing.total_inr, orderNumber);
        razorpayOrderId = rzOrder.id;
        await admin
          .from("orders")
          .update({ razorpay_order_id: rzOrder.id })
          .eq("id", order.id);
      } catch (rzErr) {
        console.error("Razorpay order creation error:", rzErr);
        return NextResponse.json(
          { error: "Could not initiate payment. Check Razorpay keys and try again." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      order_id: order.id,
      order_number: orderNumber,
      total_inr: pricing.total_inr,
      razorpay_order_id: razorpayOrderId,
      razorpay_key: razorpayKey,
    });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }
}
