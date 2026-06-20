export type AllergenKey = "egg" | "dairy" | "gluten" | "nuts" | "soy";
export type ProductTag = "bestseller" | "chef_special" | "must_try" | "new";
export type CouponType =
  | "fixed_subtotal"
  | "fixed_delivery"
  | "free_delivery"
  | "percent_subtotal";
export type ExpenseCategory =
  | "purchase"
  | "miscellaneous"
  | "transport"
  | "others";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Allergens {
  egg: boolean;
  dairy: boolean;
  gluten: boolean;
  nuts: boolean;
  soy: boolean;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price_inr: number;
  discount_percent: number | null;
  image_path: string | null;
  serves: number;
  allergens: Allergens;
  tags: ProductTag[];
  is_active: boolean;
  daily_order_limit: number | null;
  created_at: string;
  updated_at: string;
  sold_out_today?: boolean;
  remaining_next_day?: number;
  low_stock?: boolean;
  next_delivery_date?: string;
}

export interface DeliveryFenceKm {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ShopSettings {
  id: string;
  kitchen_lat: number;
  kitchen_lng: number;
  max_delivery_radius_km: number;
  delivery_fence_north_km: number;
  delivery_fence_south_km: number;
  delivery_fence_east_km: number;
  delivery_fence_west_km: number;
  orders_accepting: boolean;
  closed_dates: string[];
  store_address: string;
  fssai_license_no: string;
  phone: string;
  alt_phone: string;
  updated_at?: string;
}

export interface DeliveryFeeSlab {
  id: string;
  min_km: number;
  max_km: number;
  fee_inr: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value_inr: number;
  min_subtotal_inr: number;
  first_order_only: boolean;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export interface DeliverySlot {
  id: string;
  slot_date: string;
  window_start: string;
  window_end: string;
  max_orders: number | null;
  orders_booked: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  house: string;
  street: string;
  landmark: string | null;
  pincode: string;
  delivery_lat: number;
  delivery_lng: number;
  distance_km: number;
  delivery_fee_inr: number;
  subtotal_inr: number;
  discount_inr: number;
  total_inr: number;
  coupon_id: string | null;
  delivery_date: string;
  delivery_window_start: string;
  delivery_window_end: string;
  delivery_slot_id?: string | null;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: OrderStatus;
  cancellation_notes: string | null;
  cancelled_at: string | null;
  refund_notes: string | null;
  refunded_at: string | null;
  refund_amount_inr: number | null;
  refund_txn_id: string | null;
  delivery_vendor: string | null;
  delivery_partner_order_id: string | null;
  delivery_otp: string | null;
  delivery_partner_name: string | null;
  out_for_delivery_at: string | null;
  created_at: string;
  customer?: Customer;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_inr: number;
  line_total_inr: number;
  /** Nested join from Supabase `products(...)` */
  products?: Product | null;
  /** @deprecated Use `products` — kept for legacy joins aliased as product */
  product?: Product;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface DeliveryCalculation {
  distance_km: number;
  delivery_fee_inr: number;
  reachable: boolean;
  message?: string;
}

export interface CouponValidation {
  valid: boolean;
  coupon_id?: string;
  discount_inr: number;
  free_delivery: boolean;
  message?: string;
}

export interface OrderPricing {
  subtotal_inr: number;
  product_discount_inr: number;
  coupon_discount_inr: number;
  delivery_fee_inr: number;
  total_inr: number;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount_inr: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
}
