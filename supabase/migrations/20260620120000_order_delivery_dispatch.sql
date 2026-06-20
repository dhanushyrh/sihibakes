-- Delivery dispatch details when order goes out for delivery

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_vendor text,
  ADD COLUMN IF NOT EXISTS delivery_partner_order_id text,
  ADD COLUMN IF NOT EXISTS delivery_otp text,
  ADD COLUMN IF NOT EXISTS delivery_partner_name text,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at timestamptz;
