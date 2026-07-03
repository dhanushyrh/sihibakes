-- Per-day ready stock for next-slot same-day delivery.

ALTER TABLE public.product_daily_availability
  ADD COLUMN IF NOT EXISTS ready_quantity integer NOT NULL DEFAULT 0;

ALTER TABLE public.product_daily_availability
  DROP CONSTRAINT IF EXISTS product_daily_availability_ready_quantity_check;

ALTER TABLE public.product_daily_availability
  ADD CONSTRAINT product_daily_availability_ready_quantity_check
  CHECK (ready_quantity >= 0);

ALTER TABLE public.product_daily_availability
  DROP CONSTRAINT IF EXISTS product_daily_availability_ready_lte_limit_check;

ALTER TABLE public.product_daily_availability
  ADD CONSTRAINT product_daily_availability_ready_lte_limit_check
  CHECK (ready_quantity <= quantity_limit);

ALTER TABLE public.product_daily_counts
  ADD COLUMN IF NOT EXISTS ready_reserved integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ready_fulfilled integer NOT NULL DEFAULT 0;

ALTER TABLE public.product_daily_counts
  DROP CONSTRAINT IF EXISTS product_daily_counts_ready_reserved_check;

ALTER TABLE public.product_daily_counts
  ADD CONSTRAINT product_daily_counts_ready_reserved_check
  CHECK (ready_reserved >= 0 AND ready_fulfilled >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS uses_ready_stock boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ready_available_for_product(
  p_product_id uuid,
  p_date date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(
    0,
    COALESCE(a.ready_quantity, 0)
      - COALESCE(c.ready_reserved, 0)
      - COALESCE(c.ready_fulfilled, 0)
  )
  FROM (SELECT 1) AS _dummy
  LEFT JOIN public.product_daily_availability a
    ON a.product_id = p_product_id AND a.avail_date = p_date
  LEFT JOIN public.product_daily_counts c
    ON c.product_id = p_product_id AND c.count_date = p_date;
$$;

CREATE OR REPLACE FUNCTION public.next_same_day_slot_id(p_now timestamptz DEFAULT now())
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_today date;
  v_slot record;
BEGIN
  v_today := (p_now AT TIME ZONE 'Asia/Kolkata')::date;

  FOR v_slot IN
    SELECT id, window_start
    FROM public.delivery_slots
    WHERE slot_date = v_today
      AND is_active = true
      AND (
        (p_now AT TIME ZONE 'Asia/Kolkata')::time
        < window_end
      )
    ORDER BY window_start
  LOOP
    IF (p_now AT TIME ZONE 'Asia/Kolkata')::time < v_slot.window_start THEN
      RETURN v_slot.id;
    END IF;
  END LOOP;

  RETURN NULL;
END;
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
  v_ready_available integer;
  v_next_slot_id uuid;
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

  IF v_order.uses_ready_stock THEN
    v_next_slot_id := public.next_same_day_slot_id();

    IF v_next_slot_id IS NULL OR v_order.delivery_slot_id IS DISTINCT FROM v_next_slot_id THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Ready stock is only available for the next delivery window'
      );
    END IF;
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
      reserved_count,
      ready_reserved,
      ready_fulfilled
    )
    VALUES (v_item.product_id, v_order.delivery_date, 0, 0, 0, 0)
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

    IF v_order.uses_ready_stock THEN
      v_ready_available := public.ready_available_for_product(
        v_item.product_id,
        v_order.delivery_date
      );

      IF v_item.quantity > v_ready_available THEN
        RETURN jsonb_build_object(
          'ok', false,
          'code', 'INSUFFICIENT_READY_STOCK',
          'product_id', v_item.product_id,
          'remaining', GREATEST(v_ready_available, 0),
          'error',
            CASE
              WHEN v_ready_available <= 0 THEN 'Ready stock sold out for the next window'
              ELSE format('Only %s ready for the next window', GREATEST(v_ready_available, 0))
            END
        );
      END IF;
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
      reserved_count,
      ready_reserved,
      ready_fulfilled
    )
    VALUES (
      v_item.product_id,
      v_order.delivery_date,
      0,
      v_item.quantity,
      CASE WHEN v_order.uses_ready_stock THEN v_item.quantity ELSE 0 END,
      0
    )
    ON CONFLICT (product_id, count_date)
    DO UPDATE SET
      reserved_count = public.product_daily_counts.reserved_count + EXCLUDED.reserved_count,
      ready_reserved = public.product_daily_counts.ready_reserved + EXCLUDED.ready_reserved;
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
      order_count = order_count + v_item.quantity,
      ready_reserved = CASE
        WHEN v_order.uses_ready_stock THEN GREATEST(0, ready_reserved - v_item.quantity)
        ELSE ready_reserved
      END,
      ready_fulfilled = CASE
        WHEN v_order.uses_ready_stock THEN ready_fulfilled + v_item.quantity
        ELSE ready_fulfilled
      END
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
    SET
      reserved_count = GREATEST(0, reserved_count - v_item.quantity),
      ready_reserved = CASE
        WHEN v_order.uses_ready_stock THEN GREATEST(0, ready_reserved - v_item.quantity)
        ELSE ready_reserved
      END
    WHERE product_id = v_item.product_id
      AND count_date = v_order.delivery_date;
  END LOOP;

  UPDATE public.orders
  SET inventory_hold_status = 'released'
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
