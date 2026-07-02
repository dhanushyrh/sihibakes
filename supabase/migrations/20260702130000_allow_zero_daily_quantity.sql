-- Allow marking a product sold out for a day (0 available stock)

ALTER TABLE public.product_daily_availability
  DROP CONSTRAINT IF EXISTS product_daily_availability_quantity_limit_check;

ALTER TABLE public.product_daily_availability
  ADD CONSTRAINT product_daily_availability_quantity_limit_check
  CHECK (quantity_limit >= 0);
