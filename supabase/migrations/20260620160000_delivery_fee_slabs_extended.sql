-- Extend delivery fee slabs for longer distances

INSERT INTO public.delivery_fee_slabs (min_km, max_km, fee_inr)
SELECT 15, 20, 250
WHERE NOT EXISTS (
  SELECT 1 FROM public.delivery_fee_slabs WHERE min_km = 15 AND max_km = 20
);

INSERT INTO public.delivery_fee_slabs (min_km, max_km, fee_inr)
SELECT 20, 999, 300
WHERE NOT EXISTS (
  SELECT 1 FROM public.delivery_fee_slabs WHERE min_km = 20 AND max_km = 999
);
