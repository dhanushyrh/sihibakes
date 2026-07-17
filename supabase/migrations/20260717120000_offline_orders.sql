-- Offline (WhatsApp / Instagram) admin-created orders

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_source text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS payment_mode text;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_source_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_source_check
  CHECK (order_source IN ('online', 'offline'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_mode_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_mode_check
  CHECK (
    payment_mode IS NULL
    OR payment_mode IN ('cash', 'upi', 'bank_transfer', 'other')
  );

ALTER TABLE public.orders
  ALTER COLUMN delivery_lat DROP NOT NULL,
  ALTER COLUMN delivery_lng DROP NOT NULL,
  ALTER COLUMN distance_km DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_order_source_delivery_date
  ON public.orders (order_source, delivery_date);
