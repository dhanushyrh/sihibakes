import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isValidIndianPhone, isValidIndianPincode } from "@/lib/checkout-validation";
import {
  PAYMENT_MODE_SET,
  resolveOfflineDeliverySchedule,
} from "@/lib/offline-orders";
import {
  calcSubtotal,
  generateOrderNumber,
  getUnitPrice,
} from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentMode, Product } from "@/lib/types";

type CreateItem = {
  productId?: string;
  quantity?: number;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json();
    const {
      items,
      customer_name,
      phone,
      alt_phone,
      house,
      street,
      landmark,
      pincode,
      delivery_lat,
      delivery_lng,
      delivery_slot_id,
      delivery_date,
      delivery_window_start,
      delivery_window_end,
      payment_received,
      payment_mode,
      amount_inr,
      delivery_fee_inr,
    } = body as {
      items?: CreateItem[];
      customer_name?: string;
      phone?: string;
      alt_phone?: string;
      house?: string;
      street?: string;
      landmark?: string;
      pincode?: string;
      delivery_lat?: number | null;
      delivery_lng?: number | null;
      delivery_slot_id?: string | null;
      delivery_date?: string;
      delivery_window_start?: string;
      delivery_window_end?: string;
      payment_received?: boolean;
      payment_mode?: string;
      amount_inr?: number;
      delivery_fee_inr?: number;
    };

    const name = String(customer_name ?? "").trim();
    if (!items?.length || !name || !phone || !house || !street || !pincode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedPhone = String(phone).replace(/\D/g, "").slice(-10);
    if (!isValidIndianPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit phone number" },
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
        { error: "Alternate contact must be different from the primary number" },
        { status: 400 }
      );
    }

    if (!isValidIndianPincode(String(pincode))) {
      return NextResponse.json({ error: "Enter a valid 6-digit pincode" }, { status: 400 });
    }

    if (!PAYMENT_MODE_SET.has(payment_mode as PaymentMode)) {
      return NextResponse.json({ error: "Select a payment mode" }, { status: 400 });
    }
    const mode = payment_mode as PaymentMode;

    const totalInr = Number(amount_inr);
    if (!Number.isFinite(totalInr) || totalInr < 0 || !Number.isInteger(totalInr)) {
      return NextResponse.json(
        { error: "Enter a valid whole-rupee amount" },
        { status: 400 }
      );
    }

    const deliveryFee = Number(delivery_fee_inr ?? 0);
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0 || !Number.isInteger(deliveryFee)) {
      return NextResponse.json(
        { error: "Enter a valid delivery fee" },
        { status: 400 }
      );
    }

    let lat: number | null = null;
    let lng: number | null = null;
    if (delivery_lat != null || delivery_lng != null) {
      lat = Number(delivery_lat);
      lng = Number(delivery_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return NextResponse.json(
          { error: "Map pin latitude and longitude must be valid numbers" },
          { status: 400 }
        );
      }
    }

    const admin = createAdminClient();

    const slotId = delivery_slot_id ? String(delivery_slot_id).trim() : "";
    let slot: {
      id: string;
      slot_date: string;
      window_start: string;
      window_end: string;
    } | null = null;

    if (slotId) {
      const { data } = await admin
        .from("delivery_slots")
        .select("id, slot_date, window_start, window_end")
        .eq("id", slotId)
        .eq("is_active", true)
        .single();

      if (!data) {
        return NextResponse.json({ error: "Invalid delivery slot" }, { status: 400 });
      }
      slot = data;
    }

    const schedule = resolveOfflineDeliverySchedule({
      delivery_slot_id: slotId || null,
      delivery_date,
      delivery_window_start,
      delivery_window_end,
      slot,
    });
    if (!schedule.ok) {
      return NextResponse.json({ error: schedule.error }, { status: 400 });
    }

    const productIds = items.map((i) => String(i.productId ?? ""));
    if (productIds.some((id) => !id)) {
      return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
    }

    const { data: productsData, error: productsError } = await admin
      .from("products")
      .select("*")
      .in("id", productIds);

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    const products = (productsData ?? []) as Product[];
    const cartItems: { product: Product; quantity: number }[] = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      const quantity = Number(item.quantity);
      if (!product || !product.is_active) {
        return NextResponse.json(
          { error: "Some items are unavailable" },
          { status: 400 }
        );
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          { error: "Each item needs a quantity of at least 1" },
          { status: 400 }
        );
      }
      cartItems.push({ product, quantity });
    }

    const { subtotal } = calcSubtotal(cartItems);
    const paid = Boolean(payment_received);
    const orderNumber = generateOrderNumber();

    const { data: customer } = await admin
      .from("customers")
      .upsert(
        { name, phone: normalizedPhone },
        { onConflict: "phone" }
      )
      .select("id")
      .single();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customer?.id ?? null,
        customer_name: name,
        phone: normalizedPhone,
        alt_phone: normalizedAltPhone,
        house: String(house).trim(),
        street: String(street).trim(),
        landmark: landmark ? String(landmark).trim() : null,
        pincode: String(pincode).trim(),
        delivery_lat: lat,
        delivery_lng: lng,
        distance_km: null,
        delivery_fee_inr: deliveryFee,
        subtotal_inr: subtotal,
        discount_inr: 0,
        total_inr: totalInr,
        coupon_id: null,
        delivery_date: schedule.delivery_date,
        delivery_window_start: schedule.delivery_window_start,
        delivery_window_end: schedule.delivery_window_end,
        delivery_slot_id: schedule.delivery_slot_id,
        uses_ready_stock: false,
        order_source: "offline",
        payment_mode: mode,
        payment_status: paid ? "paid" : "pending",
        razorpay_order_id: null,
        razorpay_payment_id: paid
          ? `offline_${mode}_${Date.now()}`
          : null,
        status: "pending",
        inventory_hold_status: null,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: orderError?.message ?? "Failed to create order" },
        { status: 500 }
      );
    }

    const orderItems = cartItems.map(({ product, quantity }) => {
      const unit = getUnitPrice(product);
      return {
        order_id: order.id,
        product_id: product.id,
        quantity,
        unit_price_inr: unit,
        line_total_inr: unit * quantity,
      };
    });

    const { error: itemsError } = await admin.from("order_items").insert(orderItems);
    if (itemsError) {
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // No automated WhatsApp for offline orders (admin may message manually).
    return NextResponse.json({
      id: order.id,
      order_number: order.order_number,
    });
  } catch (err) {
    console.error("Admin offline order create failed:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
