ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS admin_new_order_whatsapp_enabled boolean NOT NULL DEFAULT true;
