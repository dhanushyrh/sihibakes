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
  | "self_delivered"
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
  is_sold_out: boolean;
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
  whatsapp_notifications_enabled: boolean;
  payment_skip_enabled: boolean;
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

export interface DeliveryVendor {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
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
  alt_phone: string;
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
  delivery_eta_display: string | null;
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
  provider?: "borzo" | "slab";
  borzo_configured?: boolean;
  error?: string;
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

export interface CustomerReview {
  id: string;
  name: string;
  area: string;
  product: string;
  rating: number;
  quote: string;
  image_path: string | null;
  reviewed_at: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EnquiryType = "kitty_party" | "general" | "landing" | "pre_order";

export type EnquiryStatus = "new" | "in_progress" | "replied" | "closed";

export interface EnquiryItem {
  id: string;
  enquiry_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  created_at?: string;
}

export type WhatsAppMessageDirection = "inbound" | "outbound";

export type WhatsAppMessageStatus =
  | "received"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type WhatsAppConversationStatus = "open" | "closed";

export interface WhatsAppConversation {
  id: string;
  wa_id: string;
  phone: string;
  customer_id: string | null;
  display_name: string | null;
  last_customer_message_at: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  status: WhatsAppConversationStatus;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  direction: WhatsAppMessageDirection;
  wa_message_id: string | null;
  message_type: string;
  body: string | null;
  template_name: string | null;
  payload: Record<string, unknown> | null;
  status: WhatsAppMessageStatus;
  error_message: string | null;
  order_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string;
}

export interface ContactEnquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  source: string;
  type: EnquiryType;
  status: EnquiryStatus;
  event_date: string | null;
  event_time: string | null;
  admin_notes: string | null;
  phone_verified_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  enquiry_items?: EnquiryItem[];
}
