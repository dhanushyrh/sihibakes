-- Per-product daily quantity limits (by delivery date)
CREATE TABLE public.product_daily_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  avail_date date NOT NULL,
  quantity_limit integer NOT NULL DEFAULT 20 CHECK (quantity_limit > 0),
  UNIQUE (product_id, avail_date)
);

CREATE INDEX idx_product_daily_availability_date
  ON public.product_daily_availability(avail_date);

ALTER TABLE public.product_daily_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product_daily_availability"
  ON public.product_daily_availability FOR SELECT USING (true);

CREATE POLICY "Admin all product_daily_availability"
  ON public.product_daily_availability FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed next 14 days at 20 units for existing products
INSERT INTO public.product_daily_availability (product_id, avail_date, quantity_limit)
SELECT p.id, d::date, 20
FROM public.products p
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + 13, '1 day'::interval) AS d
ON CONFLICT (product_id, avail_date) DO NOTHING;
