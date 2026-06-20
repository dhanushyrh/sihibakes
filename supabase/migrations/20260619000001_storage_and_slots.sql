-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admin upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND public.is_admin()
);

CREATE POLICY "Admin update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admin delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND public.is_admin());

-- Seed delivery slots for next 14 days
DO $$
DECLARE
  d date;
  w record;
BEGIN
  FOR i IN 0..13 LOOP
    d := CURRENT_DATE + i;
    FOR w IN SELECT * FROM (VALUES
      ('10:00'::time, '12:00'::time),
      ('12:00'::time, '14:00'::time),
      ('16:00'::time, '18:00'::time),
      ('18:00'::time, '20:00'::time)
    ) AS t(start_t, end_t)
    LOOP
      INSERT INTO public.delivery_slots (slot_date, window_start, window_end, max_orders, orders_booked, is_active)
      VALUES (d, w.start_t, w.end_t, 10, 0, true)
      ON CONFLICT (slot_date, window_start, window_end) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
