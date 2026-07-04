-- Private coupons are hidden from menu/checkout listings but work when entered manually.
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
