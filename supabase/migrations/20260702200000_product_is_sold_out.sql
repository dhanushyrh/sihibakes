-- Manual sold-out flag (applies to same-day and pre-order menus)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_sold_out boolean NOT NULL DEFAULT false;
