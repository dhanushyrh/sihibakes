-- Include today in availability and slots seed pattern
INSERT INTO public.product_daily_availability (product_id, avail_date, quantity_limit)
SELECT p.id, CURRENT_DATE, 20
FROM public.products p
ON CONFLICT (product_id, avail_date) DO NOTHING;

INSERT INTO public.delivery_slots (slot_date, window_start, window_end, is_active)
SELECT CURRENT_DATE, w.start_t, w.end_t, true
FROM (VALUES
  ('10:00'::time, '12:00'::time),
  ('12:00'::time, '14:00'::time),
  ('16:00'::time, '18:00'::time),
  ('18:00'::time, '20:00'::time)
) AS w(start_t, end_t)
ON CONFLICT (slot_date, window_start, window_end) DO NOTHING;
