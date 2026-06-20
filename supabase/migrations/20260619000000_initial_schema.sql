-- Sihi Bakes schema

-- Helper: check admin role from JWT app_metadata
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Shop settings (singleton)
CREATE TABLE public.shop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_lat double precision NOT NULL DEFAULT 12.9716,
  kitchen_lng double precision NOT NULL DEFAULT 77.5946,
  max_delivery_radius_km double precision NOT NULL DEFAULT 15,
  orders_accepting boolean NOT NULL DEFAULT true,
  closed_dates date[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Delivery fee slabs
CREATE TABLE public.delivery_fee_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_km double precision NOT NULL,
  max_km double precision NOT NULL,
  fee_inr integer NOT NULL,
  CONSTRAINT delivery_fee_slabs_range CHECK (min_km < max_km)
);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_inr integer NOT NULL CHECK (price_inr > 0),
  discount_percent integer CHECK (discount_percent >= 0 AND discount_percent <= 100),
  image_path text,
  serves integer NOT NULL DEFAULT 1 CHECK (serves > 0),
  allergens jsonb NOT NULL DEFAULT '{"egg":false,"dairy":false,"gluten":false,"nuts":false,"soy":false}',
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  daily_order_limit integer CHECK (daily_order_limit IS NULL OR daily_order_limit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Daily product order counts
CREATE TABLE public.product_daily_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  order_count integer NOT NULL DEFAULT 0,
  UNIQUE (product_id, count_date)
);

-- Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('fixed_subtotal','fixed_delivery','free_delivery','percent_subtotal')),
  value_inr integer NOT NULL DEFAULT 0,
  min_subtotal_inr integer NOT NULL DEFAULT 0,
  first_order_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Delivery slots
CREATE TABLE public.delivery_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date date NOT NULL,
  window_start time NOT NULL,
  window_end time NOT NULL,
  max_orders integer CHECK (max_orders IS NULL OR max_orders > 0),
  orders_booked integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (slot_date, window_start, window_end)
);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  house text NOT NULL,
  street text NOT NULL,
  landmark text,
  pincode text NOT NULL,
  delivery_lat double precision NOT NULL,
  delivery_lng double precision NOT NULL,
  distance_km double precision NOT NULL,
  delivery_fee_inr integer NOT NULL DEFAULT 0,
  subtotal_inr integer NOT NULL,
  discount_inr integer NOT NULL DEFAULT 0,
  total_inr integer NOT NULL,
  coupon_id uuid REFERENCES public.coupons(id),
  delivery_date date NOT NULL,
  delivery_window_start time NOT NULL,
  delivery_window_end time NOT NULL,
  delivery_slot_id uuid REFERENCES public.delivery_slots(id),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  razorpay_order_id text,
  razorpay_payment_id text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','preparing','out_for_delivery','delivered','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_inr integer NOT NULL,
  line_total_inr integer NOT NULL
);

-- Indexes
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_orders_phone ON public.orders(phone);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX idx_delivery_slots_date ON public.delivery_slots(slot_date);
CREATE INDEX idx_product_daily_counts ON public.product_daily_counts(product_id, count_date);

-- RLS
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_fee_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_daily_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read shop_settings" ON public.shop_settings FOR SELECT USING (true);
CREATE POLICY "Public read delivery_fee_slabs" ON public.delivery_fee_slabs FOR SELECT USING (true);
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Public read product_daily_counts" ON public.product_daily_counts FOR SELECT USING (true);
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Public read active delivery_slots" ON public.delivery_slots FOR SELECT USING (is_active = true OR public.is_admin());

-- Admin write policies
CREATE POLICY "Admin all shop_settings" ON public.shop_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all delivery_fee_slabs" ON public.delivery_fee_slabs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all products" ON public.products FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all product_daily_counts" ON public.product_daily_counts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all coupons" ON public.coupons FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all delivery_slots" ON public.delivery_slots FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all orders" ON public.orders FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin all order_items" ON public.order_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed data
INSERT INTO public.shop_settings (kitchen_lat, kitchen_lng, max_delivery_radius_km, orders_accepting)
VALUES (12.9716, 77.5946, 15, true);

INSERT INTO public.delivery_fee_slabs (min_km, max_km, fee_inr) VALUES
  (0, 3, 0),
  (3, 5, 100),
  (5, 10, 150),
  (10, 15, 200);

INSERT INTO public.coupons (code, type, value_inr, min_subtotal_inr, first_order_only) VALUES
  ('FIRST59', 'fixed_subtotal', 59, 0, true),
  ('SAVE100', 'fixed_subtotal', 100, 600, false),
  ('FREEDEL', 'free_delivery', 0, 1000, false);

INSERT INTO public.products (title, description, price_inr, discount_percent, image_path, serves, allergens, tags, is_active, daily_order_limit)
VALUES (
  'Classic Tiramisu',
  'Our signature tiramisu — layers of espresso-soaked ladyfingers and silky mascarpone cream, finished with a dusting of premium cocoa. Served in our signature kraft tub.',
  499,
  null,
  '/hero-tiramisu.png',
  2,
  '{"egg": true, "dairy": true, "gluten": true, "nuts": false, "soy": false}',
  ARRAY['bestseller', 'must_try'],
  true,
  20
);

-- Storage bucket (run in Supabase dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
