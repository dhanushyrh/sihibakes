-- Admin toggle to bypass Razorpay during testing (e.g. before going live with payments)

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS payment_skip_enabled boolean NOT NULL DEFAULT false;
