-- Re-enable 18:00–20:00 delivery window for upcoming days.

DO $$
DECLARE
  d date;
BEGIN
  FOR i IN 0..27 LOOP
    d := CURRENT_DATE + i;
    INSERT INTO public.delivery_slots (slot_date, window_start, window_end, max_orders, orders_booked, is_active)
    VALUES (d, '18:00'::time, '20:00'::time, 10, 0, true)
    ON CONFLICT (slot_date, window_start, window_end) DO UPDATE
      SET is_active = true;
  END LOOP;
END $$;
