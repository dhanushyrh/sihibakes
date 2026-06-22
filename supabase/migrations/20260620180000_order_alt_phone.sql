ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS alt_phone text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.orders.phone IS 'Primary WhatsApp / contact number';
COMMENT ON COLUMN public.orders.alt_phone IS 'Alternate contact number for delivery';
