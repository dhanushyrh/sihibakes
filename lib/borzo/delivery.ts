import { formatPhoneForWhatsApp } from "@/lib/whatsapp/phone";
import { haversineDistanceKm } from "@/lib/delivery";
import type { Order, ShopSettings } from "@/lib/types";
import { calculateBorzoOrder, createBorzoOrder, getBorzoCourier } from "./client";
import { BORZO_VENDOR_NAME } from "./config";
import type { BorzoQuoteSlot } from "./quote-slot";
import type {
  BorzoDeliveryQuote,
  BorzoDispatchResult,
  BorzoOrderRequest,
  BorzoPoint,
} from "./types";

function borzoPhone(phone: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) {
    throw new Error("Invalid phone number for Borzo delivery");
  }
  return formatted;
}

function formatCoordinate(value: number): string {
  return value.toFixed(7);
}

export function formatCustomerAddress(order: Pick<Order, "house" | "street" | "landmark" | "pincode">): string {
  const parts = [order.house, order.street];
  if (order.landmark?.trim()) parts.push(order.landmark.trim());
  parts.push(order.pincode);
  return parts.filter(Boolean).join(", ");
}

function slotDatetime(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return `${date}T${normalizedTime}+05:30`;
}

function applyQuoteWindow(point: BorzoPoint, window: BorzoQuoteSlot["pickup"]) {
  point.required_start_datetime = slotDatetime(window.startDate, window.startTime);
  point.required_finish_datetime = slotDatetime(window.finishDate, window.finishTime);
}

export function generateDeliveryOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function buildPoints(params: {
  settings: ShopSettings;
  customerLat: number;
  customerLng: number;
  customerAddress: string;
  customerName: string;
  customerPhone: string;
  clientOrderId?: string;
  deliveryOtp?: string;
  deliveryNote?: string;
  slot?: { date: string; windowStart: string; windowEnd: string };
}): BorzoPoint[] {
  const storePoint: BorzoPoint = {
    address: params.settings.store_address || "Store pickup",
    latitude: formatCoordinate(params.settings.kitchen_lat),
    longitude: formatCoordinate(params.settings.kitchen_lng),
    contact_person: {
      phone: borzoPhone(params.settings.phone || params.settings.alt_phone),
      name: "Sihi Bakes",
    },
  };

  const customerPoint: BorzoPoint = {
    address: params.customerAddress,
    latitude: formatCoordinate(params.customerLat),
    longitude: formatCoordinate(params.customerLng),
    contact_person: {
      phone: borzoPhone(params.customerPhone),
      name: params.customerName,
    },
    client_order_id: params.clientOrderId ?? null,
    note: params.deliveryNote ?? null,
    checkin_code: params.deliveryOtp ?? null,
  };

  if (params.slot) {
    customerPoint.required_start_datetime = slotDatetime(
      params.slot.date,
      params.slot.windowStart
    );
    customerPoint.required_finish_datetime = slotDatetime(
      params.slot.date,
      params.slot.windowEnd
    );
  }

  return [storePoint, customerPoint];
}

function buildOrderPayload(params: {
  matter: string;
  points: BorzoPoint[];
}): BorzoOrderRequest {
  return {
    type: "standard",
    matter: params.matter,
    points: params.points,
  };
}

function parseBorzoFeeInr(order: {
  payment_amount?: string | null;
  delivery_fee_amount?: string | null;
}): number {
  for (const amount of [order.payment_amount, order.delivery_fee_amount]) {
    const parsed = Number.parseFloat(amount ?? "0");
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.ceil(parsed);
    }
  }
  return 0;
}

function buildQuotePoints(params: {
  settings: ShopSettings;
  customerLat: number;
  customerLng: number;
  customerAddress: string;
  slot: BorzoQuoteSlot;
}): BorzoPoint[] {
  const storePoint: BorzoPoint = {
    address: params.settings.store_address || "Store pickup",
    latitude: formatCoordinate(params.settings.kitchen_lat),
    longitude: formatCoordinate(params.settings.kitchen_lng),
  };
  applyQuoteWindow(storePoint, params.slot.pickup);

  const customerPoint: BorzoPoint = {
    address: params.customerAddress,
    latitude: formatCoordinate(params.customerLat),
    longitude: formatCoordinate(params.customerLng),
  };
  applyQuoteWindow(customerPoint, params.slot.delivery);

  return [storePoint, customerPoint];
}

function formatEstimatedArrival(
  order: Pick<Order, "delivery_date" | "delivery_window_start" | "delivery_window_end">,
  customerPoint?: { estimated_arrival_datetime: string | null; required_finish_datetime: string | null }
): string {
  if (customerPoint?.estimated_arrival_datetime) {
    return formatBorzoTimestamp(customerPoint.estimated_arrival_datetime);
  }
  if (customerPoint?.required_finish_datetime) {
    return formatBorzoTimestamp(customerPoint.required_finish_datetime);
  }
  const start = order.delivery_window_start.slice(0, 5);
  const end = order.delivery_window_end.slice(0, 5);
  return `${order.delivery_date}, ${start}–${end}`;
}

function formatBorzoTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function courierDisplayName(courier: {
  name?: string;
  surname?: string;
} | null): string {
  if (!courier) return BORZO_VENDOR_NAME;
  const parts = [courier.name, courier.surname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : BORZO_VENDOR_NAME;
}

export async function quoteBorzoDelivery(params: {
  settings: ShopSettings;
  customerLat: number;
  customerLng: number;
  customerAddress: string;
  slot: BorzoQuoteSlot;
}): Promise<BorzoDeliveryQuote> {
  const points = buildQuotePoints({
    settings: params.settings,
    customerLat: params.customerLat,
    customerLng: params.customerLng,
    customerAddress: params.customerAddress,
    slot: params.slot,
  });

  const order = await calculateBorzoOrder(
    buildOrderPayload({
      matter: "Bakery delivery quote",
      points,
    })
  );

  const delivery_fee_inr = parseBorzoFeeInr(order);
  if (delivery_fee_inr <= 0) {
    throw new Error(
      `Borzo returned no delivery fee (payment_amount=${order.payment_amount ?? "null"}, delivery_fee_amount=${order.delivery_fee_amount ?? "null"})`
    );
  }

  return {
    delivery_fee_inr,
    payment_amount: order.payment_amount ?? order.delivery_fee_amount ?? "0.00",
    warnings: [],
  };
}

export async function dispatchBorzoDelivery(
  order: Order,
  settings: ShopSettings
): Promise<BorzoDispatchResult> {
  const deliveryOtp = generateDeliveryOtp();
  const customerAddress = formatCustomerAddress(order);

  const points = buildPoints({
    settings,
    customerLat: order.delivery_lat,
    customerLng: order.delivery_lng,
    customerAddress,
    customerName: order.customer_name,
    customerPhone: order.phone,
    clientOrderId: order.order_number,
    deliveryOtp,
    deliveryNote: [order.house, order.landmark].filter(Boolean).join(" · ") || undefined,
    slot: {
      date: order.delivery_date,
      windowStart: order.delivery_window_start,
      windowEnd: order.delivery_window_end,
    },
  });

  const borzoOrder = await createBorzoOrder(
    buildOrderPayload({
      matter: `Bakery order ${order.order_number}`,
      points,
    })
  );

  const customerPoint = borzoOrder.points[borzoOrder.points.length - 1];
  const otp = customerPoint?.checkin_code?.trim() || deliveryOtp;

  let partnerName = courierDisplayName(borzoOrder.courier);
  try {
    const courier = await getBorzoCourier(borzoOrder.order_id);
    if (courier) {
      partnerName = courierDisplayName(courier);
    }
  } catch {
    // Courier may not be assigned yet.
  }

  return {
    borzo_order_id: String(borzoOrder.order_id),
    delivery_otp: otp,
    delivery_partner_name: partnerName,
    estimated_arrival_display: formatEstimatedArrival(order, customerPoint),
  };
}

export function borzoDistanceKm(
  settings: ShopSettings,
  customerLat: number,
  customerLng: number
): number {
  return haversineDistanceKm(
    settings.kitchen_lat,
    settings.kitchen_lng,
    customerLat,
    customerLng
  );
}

export function isBorzoVendorName(vendor: string): boolean {
  return vendor.trim().toLowerCase() === BORZO_VENDOR_NAME.toLowerCase();
}
