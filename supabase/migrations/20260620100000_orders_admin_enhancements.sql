-- Customers + admin order fields + pending status + seed data

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN customer_id uuid REFERENCES public.customers(id),
  ADD COLUMN cancellation_notes text,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN refund_notes text,
  ADD COLUMN refunded_at timestamptz;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled'));

CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_customer_name ON public.orders(customer_name);
CREATE INDEX idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_customers_phone ON public.customers(phone);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin all customers" ON public.customers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Dummy customer + pending payment order for admin demo
INSERT INTO public.customers (id, name, phone, email)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'Priya Sharma',
  '9876543210',
  'priya.sharma@example.com'
);

INSERT INTO public.orders (
  id,
  order_number,
  customer_id,
  customer_name,
  phone,
  house,
  street,
  landmark,
  pincode,
  delivery_lat,
  delivery_lng,
  distance_km,
  delivery_fee_inr,
  subtotal_inr,
  discount_inr,
  total_inr,
  delivery_date,
  delivery_window_start,
  delivery_window_end,
  payment_status,
  status
)
VALUES (
  'b2000000-0000-4000-8000-000000000001',
  'SIHI-20260620-0001',
  'a1000000-0000-4000-8000-000000000001',
  'Priya Sharma',
  '9876543210',
  '42',
  'Indiranagar 100 Feet Road',
  'Near CMH Park',
  '560038',
  12.9784,
  77.6408,
  4.2,
  100,
  499,
  0,
  599,
  (CURRENT_DATE + interval '2 days')::date,
  '10:00',
  '12:00',
  'paid',
  'confirmed'
);

INSERT INTO public.order_items (order_id, product_id, quantity, unit_price_inr, line_total_inr)
SELECT
  'b2000000-0000-4000-8000-000000000001',
  p.id,
  1,
  499,
  499
FROM public.products p
WHERE p.title = 'Classic Tiramisu'
LIMIT 1;
