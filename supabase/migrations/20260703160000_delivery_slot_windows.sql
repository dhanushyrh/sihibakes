-- Standardize delivery windows to 11–1, 4–6, 8–10 PM (shop time).

UPDATE public.delivery_slots
SET is_active = false
WHERE window_start IN ('10:00:00'::time, '12:00:00'::time, '18:00:00'::time);

DO $$
DECLARE
  d date;
  w record;
BEGIN
  FOR i IN 0..27 LOOP
    d := CURRENT_DATE + i;
    FOR w IN SELECT * FROM (VALUES
      ('11:00'::time, '13:00'::time),
      ('16:00'::time, '18:00'::time),
      ('20:00'::time, '22:00'::time)
    ) AS t(start_t, end_t)
    LOOP
      INSERT INTO public.delivery_slots (slot_date, window_start, window_end, max_orders, orders_booked, is_active)
      VALUES (d, w.start_t, w.end_t, 10, 0, true)
      ON CONFLICT (slot_date, window_start, window_end) DO UPDATE
        SET is_active = true;
    END LOOP;
  END LOOP;
END $$;
