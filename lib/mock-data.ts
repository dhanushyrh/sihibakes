import type {
  DeliveryFeeSlab,
  DeliverySlot,
  Product,
  ShopSettings,
} from "./types";

export const MOCK_SETTINGS: ShopSettings = {
  id: "mock",
  kitchen_lat: 12.9716,
  kitchen_lng: 77.5946,
  max_delivery_radius_km: 15,
  delivery_fence_north_km: 15,
  delivery_fence_south_km: 5,
  delivery_fence_east_km: 15,
  delivery_fence_west_km: 15,
  orders_accepting: true,
  closed_dates: [],
  store_address: "",
  fssai_license_no: "",
  phone: "",
  alt_phone: "",
};

export const MOCK_SLABS: DeliveryFeeSlab[] = [
  { id: "1", min_km: 0, max_km: 3, fee_inr: 0 },
  { id: "2", min_km: 3, max_km: 5, fee_inr: 100 },
  { id: "3", min_km: 5, max_km: 10, fee_inr: 150 },
  { id: "4", min_km: 10, max_km: 15, fee_inr: 200 },
  { id: "5", min_km: 15, max_km: 20, fee_inr: 250 },
  { id: "6", min_km: 20, max_km: 999, fee_inr: 300 },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "mock-tiramisu",
    title: "Classic Tiramisu",
    description:
      "Our signature tiramisu — layers of espresso-soaked ladyfingers and silky mascarpone cream, finished with a dusting of premium cocoa.",
    price_inr: 499,
    discount_percent: null,
    image_path: "/hero-tiramisu.png",
    serves: 2,
    allergens: { egg: true, dairy: true, gluten: true, nuts: false, soy: false },
    tags: ["bestseller", "must_try"],
    is_active: true,
    daily_order_limit: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sold_out_today: false,
  },
];

function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured() {
  return hasSupabase();
}

export function getMockSlots(): DeliverySlot[] {
  const slots: DeliverySlot[] = [];
  for (let d = 0; d < 14; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const slotDate = date.toISOString().slice(0, 10);
    for (const [start, end] of [
      ["10:00:00", "12:00:00"],
      ["12:00:00", "14:00:00"],
      ["16:00:00", "18:00:00"],
      ["18:00:00", "20:00:00"],
    ]) {
      slots.push({
        id: `mock-${slotDate}-${start}`,
        slot_date: slotDate,
        window_start: start,
        window_end: end,
        max_orders: 10,
        orders_booked: 0,
        is_active: true,
      });
    }
  }
  return slots;
}
