-- Cancel unpaid orders when inventory hold is released; schedule pg_cron cleanup.

CREATE OR REPLACE FUNCTION public.release_order_inventory(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
  v_today date;
BEGIN
  v_today := public.shop_today_date();

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
  END IF;

  IF v_order.inventory_hold_status = 'released' THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_order.inventory_hold_status = 'committed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inventory already committed');
  END IF;

  IF v_order.delivery_date <> v_today THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  IF v_order.inventory_hold_status IS DISTINCT FROM 'held' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
    ORDER BY product_id
  LOOP
    UPDATE public.product_daily_counts
    SET reserved_count = GREATEST(0, reserved_count - v_item.quantity)
    WHERE product_id = v_item.product_id
      AND count_date = v_order.delivery_date;
  END LOOP;

  UPDATE public.orders
  SET
    inventory_hold_status = 'released',
    status = CASE
      WHEN payment_status = 'pending' THEN 'cancelled'
      ELSE status
    END,
    payment_status = CASE
      WHEN payment_status = 'pending' THEN 'failed'
      ELSE payment_status
    END,
    cancellation_notes = CASE
      WHEN payment_status = 'pending' THEN COALESCE(cancellation_notes, 'Payment abandoned')
      ELSE cancellation_notes
    END,
    cancelled_at = CASE
      WHEN payment_status = 'pending' THEN COALESCE(cancelled_at, now())
      ELSE cancelled_at
    END
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

DO $outer$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available: %', SQLERRM;
END;
$outer$;

DO $outer$
DECLARE
  v_jobid bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed — enable via Supabase Dashboard → Integrations → Cron';
    RETURN;
  END IF;

  FOR v_jobid IN
    SELECT jobid FROM cron.job WHERE jobname = 'release-expired-inventory-holds'
  LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;

  PERFORM cron.schedule(
    'release-expired-inventory-holds',
    '*/5 * * * *',
    $cron$SELECT public.release_expired_inventory_holds()$cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule failed — create job in Dashboard: %', SQLERRM;
END;
$outer$;
