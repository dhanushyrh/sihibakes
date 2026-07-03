export const BRAND = {
  name: "Sihi Bakes",
  tagline: "Desserts & Bakes",
  colors: {
    chocolate: "#4B2C20",
    cream: "#F5E6D3",
    white: "#FFFFFF",
  },
} as const;

/** Public contact shown when shop settings phone is unset */
export const STORE_CONTACT = {
  phone: "8310923990",
  instagramUrl: "https://www.instagram.com/sihi.bakes",
} as const;

export const ALLERGEN_OPTIONS = [
  { key: "egg" as const, label: "Egg" },
  { key: "dairy" as const, label: "Dairy" },
  { key: "gluten" as const, label: "Gluten" },
  { key: "nuts" as const, label: "Nuts" },
  { key: "soy" as const, label: "Soy" },
];

export const TAG_OPTIONS = [
  { key: "bestseller" as const, label: "Bestseller" },
  { key: "chef_special" as const, label: "Chef Special" },
  { key: "must_try" as const, label: "Must Try" },
  { key: "new" as const, label: "New" },
];

export const ORDER_STATUS_OPTIONS = [
  { key: "pending" as const, label: "Pending" },
  { key: "confirmed" as const, label: "Confirmed" },
  { key: "preparing" as const, label: "Preparing" },
  { key: "out_for_delivery" as const, label: "Out for Delivery" },
  { key: "delivered" as const, label: "Delivered" },
  { key: "self_delivered" as const, label: "Self Delivered" },
  { key: "cancelled" as const, label: "Cancelled" },
];

export const PAYMENT_STATUS_OPTIONS = [
  { key: "pending" as const, label: "Pending" },
  { key: "paid" as const, label: "Paid" },
  { key: "failed" as const, label: "Failed" },
  { key: "refunded" as const, label: "Refunded" },
];

export const ORDERS_PAGE_SIZE = 15;
export const CUSTOMERS_PAGE_SIZE = 15;
export const ENQUIRIES_PAGE_SIZE = 15;
export const WHATSAPP_CONVERSATIONS_PAGE_SIZE = 20;
export const WHATSAPP_MESSAGES_PAGE_SIZE = 50;

/** Meta WhatsApp customer service window for free-form replies. */
export const WHATSAPP_SERVICE_WINDOW_HOURS = 24;

export const WHATSAPP_ADMIN_TEMPLATE_OPTIONS = [
  { key: "order_confirmed_v2", label: "Order confirmed" },
  { key: "order_confirmed", label: "Order confirmed (legacy)" },
  { key: "order_delivered", label: "Order delivered" },
  { key: "order_status_update", label: "Order status update" },
  { key: "order_on_the_way_v2", label: "Out for delivery" },
  { key: "order_self_on_the_way_v2", label: "Self delivery — on the way" },
  { key: "order_cancelled", label: "Order cancelled" },
] as const;

/** Inclusive calendar days customers can book delivery (today + next days). */
export const ORDER_BOOKING_WINDOW_DAYS = 4;

/** Max future dates shown in the pre-order flow (excludes today). */
export const PRE_ORDER_MAX_DATES = 3;

/** How far ahead to scan delivery slots when picking pre-order dates. */
export const PRE_ORDER_SCAN_DAYS = 14;

export const ENQUIRY_TYPE_OPTIONS = [
  { key: "kitty_party" as const, label: "Kitty Party" },
  { key: "general" as const, label: "General" },
  { key: "landing" as const, label: "Landing" },
] as const;

export const ENQUIRY_STATUS_OPTIONS = [
  { key: "new" as const, label: "New" },
  { key: "in_progress" as const, label: "In progress" },
  { key: "replied" as const, label: "Replied" },
  { key: "closed" as const, label: "Closed" },
] as const;

export const COUPON_TYPE_OPTIONS = [
  { key: "fixed_subtotal" as const, label: "Fixed off subtotal" },
  { key: "fixed_delivery" as const, label: "Fixed off delivery" },
  { key: "free_delivery" as const, label: "Free delivery" },
  { key: "percent_subtotal" as const, label: "Percent off subtotal" },
];

export const EXPENSE_CATEGORY_OPTIONS = [
  { key: "purchase" as const, label: "Purchase" },
  { key: "miscellaneous" as const, label: "Miscellaneous" },
  { key: "transport" as const, label: "Transport" },
  { key: "others" as const, label: "Others" },
];

// Default Bangalore kitchen coords (admin can update)
export const DEFAULT_KITCHEN = { lat: 12.9716, lng: 77.5946 };
