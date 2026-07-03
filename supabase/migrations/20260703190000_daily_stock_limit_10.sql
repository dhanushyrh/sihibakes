-- Default daily stock per product: 10 units (was 20).

ALTER TABLE public.product_daily_availability
  ALTER COLUMN quantity_limit SET DEFAULT 10;

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
    10
  );
$$;

-- Upcoming dates (shop timezone): cap at 10, never below sold + reserved.
UPDATE public.product_daily_availability a
SET
  quantity_limit = GREATEST(
    10,
    COALESCE(c.order_count, 0) + COALESCE(c.reserved_count, 0)
  ),
  ready_quantity = LEAST(
    a.ready_quantity,
    GREATEST(
      10,
      COALESCE(c.order_count, 0) + COALESCE(c.reserved_count, 0)
    )
  )
FROM public.product_daily_counts c
WHERE c.product_id = a.product_id
  AND c.count_date = a.avail_date
  AND a.avail_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date;

UPDATE public.product_daily_availability a
SET
  quantity_limit = 10,
  ready_quantity = LEAST(a.ready_quantity, 10)
WHERE a.avail_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date
  AND NOT EXISTS (
    SELECT 1
    FROM public.product_daily_counts c
    WHERE c.product_id = a.product_id
      AND c.count_date = a.avail_date
  );

-- Seed upcoming days at 10 for products missing availability rows.
INSERT INTO public.product_daily_availability (product_id, avail_date, quantity_limit, ready_quantity)
SELECT p.id, d::date, 10, 0
FROM public.products p
CROSS JOIN generate_series(
  (now() AT TIME ZONE 'Asia/Kolkata')::date,
  (now() AT TIME ZONE 'Asia/Kolkata')::date + 27,
  '1 day'::interval
) AS d
ON CONFLICT (product_id, avail_date) DO NOTHING;
