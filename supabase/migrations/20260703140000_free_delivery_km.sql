ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS free_delivery_km double precision NOT NULL DEFAULT 5;
