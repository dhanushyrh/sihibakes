-- Admin-editable ETA shown in out-for-delivery WhatsApp messages

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_eta_display text;
