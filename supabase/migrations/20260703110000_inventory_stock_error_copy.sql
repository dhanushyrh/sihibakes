-- Align reserve_order_inventory stock error text with customer-facing copy.

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
  v_product_title text;
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
    SELECT oi.product_id, oi.quantity, p.title AS product_title
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
    ORDER BY oi.product_id
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
      v_product_title := v_item.product_title;
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'INSUFFICIENT_STOCK',
        'product_id', v_item.product_id,
        'remaining', GREATEST(v_remaining, 0),
        'error',
          CASE
            WHEN v_remaining <= 0 THEN
              format('Sorry %s is sold out for the day.', v_product_title)
            ELSE
              format(
                'Only %s %s available to order.',
                GREATEST(v_remaining, 0),
                v_product_title
              )
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
