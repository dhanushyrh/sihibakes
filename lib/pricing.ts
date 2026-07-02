import type { Coupon, CouponValidation, OrderPricing, Product } from "./types";
import { lookupDeliveryFee } from "./delivery";
import type { DeliveryFeeSlab } from "./types";

export function getUnitPrice(product: Product): number {
  const discount = product.discount_percent ?? 0;
  return Math.round(product.price_inr * (1 - discount / 100));
}

export function calcLineTotal(product: Product, quantity: number): number {
  return getUnitPrice(product) * quantity;
}

export function calcSubtotal(
  items: { product: Product; quantity: number }[]
): { subtotal: number; productDiscount: number } {
  let subtotal = 0;
  let productDiscount = 0;
  for (const { product, quantity } of items) {
    const full = product.price_inr * quantity;
    const discounted = calcLineTotal(product, quantity);
    subtotal += discounted;
    productDiscount += full - discounted;
  }
  return { subtotal, productDiscount };
}

export function applyCoupon(
  coupon: Coupon,
  subtotal: number,
  deliveryFee: number,
  isFirstOrder: boolean
): CouponValidation {
  if (!coupon.is_active) {
    return { valid: false, discount_inr: 0, free_delivery: false, message: "Coupon is inactive" };
  }
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, discount_inr: 0, free_delivery: false, message: "Coupon not yet valid" };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { valid: false, discount_inr: 0, free_delivery: false, message: "Coupon has expired" };
  }
  if (coupon.first_order_only && !isFirstOrder) {
    return { valid: false, discount_inr: 0, free_delivery: false, message: "Valid for first order only" };
  }
  if (subtotal < coupon.min_subtotal_inr) {
    return {
      valid: false,
      discount_inr: 0,
      free_delivery: false,
      message: `Minimum order of ₹${coupon.min_subtotal_inr} required`,
    };
  }

  switch (coupon.type) {
    case "fixed_subtotal":
      return {
        valid: true,
        coupon_id: coupon.id,
        discount_inr: Math.min(coupon.value_inr, subtotal),
        free_delivery: false,
      };
    case "fixed_delivery":
      return {
        valid: true,
        coupon_id: coupon.id,
        discount_inr: Math.min(coupon.value_inr, deliveryFee),
        free_delivery: false,
      };
    case "free_delivery":
      return {
        valid: true,
        coupon_id: coupon.id,
        discount_inr: deliveryFee,
        free_delivery: true,
      };
    case "percent_subtotal":
      return {
        valid: true,
        coupon_id: coupon.id,
        discount_inr: Math.round((subtotal * coupon.value_inr) / 100),
        free_delivery: false,
      };
    default:
      return { valid: false, discount_inr: 0, free_delivery: false, message: "Invalid coupon" };
  }
}

export function calcOrderTotal(
  items: { product: Product; quantity: number }[],
  distanceKm: number,
  slabs: DeliveryFeeSlab[],
  couponResult?: CouponValidation,
  deliveryFeeInr?: number
): OrderPricing {
  const { subtotal, productDiscount } = calcSubtotal(items);
  let deliveryFee = deliveryFeeInr ?? lookupDeliveryFee(distanceKm, slabs);
  let couponDiscount = 0;

  if (couponResult?.valid) {
    if (couponResult.free_delivery) {
      couponDiscount = deliveryFee;
      deliveryFee = 0;
    } else {
      couponDiscount = couponResult.discount_inr;
    }
  }

  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);

  return {
    subtotal_inr: Math.round(subtotal),
    product_discount_inr: Math.round(productDiscount),
    coupon_discount_inr: Math.round(couponDiscount),
    delivery_fee_inr: Math.round(deliveryFee),
    total_inr: Math.round(total),
  };
}

export function generateOrderNumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `SIHI-${ymd}-${rand}`;
}
