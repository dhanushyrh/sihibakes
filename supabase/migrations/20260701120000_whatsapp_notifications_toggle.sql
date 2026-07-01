ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled boolean NOT NULL DEFAULT true;
