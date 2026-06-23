-- Add Borzo as a delivery vendor for automated dispatch

INSERT INTO public.delivery_vendors (name, sort_order)
SELECT 'Borzo', 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.delivery_vendors WHERE lower(name) = 'borzo'
);
