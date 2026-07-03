-- Same-day inventory holds during checkout payment

ALTER TABLE public.product_daily_counts
  ADD COLUMN IF NOT EXISTS reserved_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_hold_status text
    CHECK (inventory_hold_status IS NULL OR inventory_hold_status IN ('held', 'committed', 'released')),
  ADD COLUMN IF NOT EXISTS inventory_held_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_hold_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_inventory_hold_expires
  ON public.orders (inventory_hold_expires_at)
  WHERE inventory_hold_status = 'held' AND payment_status = 'pending';

CREATE OR REPLACE FUNCTION public.shop_today_date()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date;
$$;

CREATE OR REPLACE FUNCTION public.product_daily_limit(
  p_product_id uuid,
  p_date date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT quantity_limit
      FROM public.product_daily_availability
      WHERE product_id = p_product_id
        AND avail_date = p_date
    ),
    20
  );
$$;

CREATE OR REPLACE FUNCTION public.reserve_order_inventory(
  p_order_id uuid,
  p_hold_minutes integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
  v_limit integer;
  v_sold integer;
  v_reserved integer;
  v_remaining integer;
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

  IF v_order.inventory_hold_status = 'held' THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_order.inventory_hold_status IN ('committed', 'released') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inventory already processed');
  END IF;

  IF v_order.delivery_date <> v_today THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
    ORDER BY product_id
  LOOP
    INSERT INTO public.product_daily_counts (
      product_id,
      count_date,
      order_count,
      reserved_count
    )
    VALUES (v_item.product_id, v_order.delivery_date, 0, 0)
    ON CONFLICT (product_id, count_date) DO NOTHING;

    v_limit := public.product_daily_limit(v_item.product_id, v_order.delivery_date);

    SELECT order_count, reserved_count
    INTO v_sold, v_reserved
    FROM public.product_daily_counts
    WHERE product_id = v_item.product_id
      AND count_date = v_order.delivery_date
    FOR UPDATE;

    v_sold := COALESCE(v_sold, 0);
    v_reserved := COALESCE(v_reserved, 0);
    v_remaining := v_limit - v_sold - v_reserved;

    IF v_item.quantity > v_remaining THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'INSUFFICIENT_STOCK',
        'product_id', v_item.product_id,
        'remaining', GREATEST(v_remaining, 0),
        'error',
          CASE
            WHEN v_remaining <= 0 THEN 'Sold out for today'
            ELSE format('Only %s left for today', GREATEST(v_remaining, 0))
          END
      );
    END IF;
  END LOOP;

  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
    ORDER BY product_id
  LOOP
    INSERT INTO public.product_daily_counts (
      product_id,
      count_date,
      order_count,
      reserved_count
    )
    VALUES (v_item.product_id, v_order.delivery_date, 0, v_item.quantity)
    ON CONFLICT (product_id, count_date)
    DO UPDATE SET
      reserved_count = public.product_daily_counts.reserved_count + EXCLUDED.reserved_count;
  END LOOP;

  UPDATE public.orders
  SET
    inventory_hold_status = 'held',
    inventory_held_at = now(),
    inventory_hold_expires_at = now() + make_interval(mins => p_hold_minutes)
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_order_inventory(p_order_id uuid)
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

  IF v_order.inventory_hold_status = 'committed' THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_order.delivery_date <> v_today THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true);
  END IF;

  IF v_order.inventory_hold_status IS DISTINCT FROM 'held' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No active inventory hold');
  END IF;

  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
    ORDER BY product_id
  LOOP
    UPDATE public.product_daily_counts
    SET
      reserved_count = GREATEST(0, reserved_count - v_item.quantity),
      order_count = order_count + v_item.quantity
    WHERE product_id = v_item.product_id
      AND count_date = v_order.delivery_date;
  END LOOP;

  UPDATE public.orders
  SET inventory_hold_status = 'committed'
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

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
  SET inventory_hold_status = 'released'
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_inventory_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_released integer := 0;
BEGIN
  FOR v_order IN
    SELECT id
    FROM public.orders
    WHERE inventory_hold_status = 'held'
      AND payment_status = 'pending'
      AND inventory_hold_expires_at IS NOT NULL
      AND inventory_hold_expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_order_inventory(v_order.id);
    v_released := v_released + 1;
  END LOOP;

  RETURN v_released;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_order_inventory(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_order_inventory(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_inventory(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_inventory_holds() TO service_role;
