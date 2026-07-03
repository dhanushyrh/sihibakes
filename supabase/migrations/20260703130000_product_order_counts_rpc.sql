-- Aggregated product order counts for admin dashboard (avoids loading all order_items rows).
CREATE OR REPLACE FUNCTION get_product_order_counts(since timestamptz)
RETURNS TABLE (product_id uuid, units bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT oi.product_id, SUM(oi.quantity)::bigint AS units
  FROM order_items oi
  INNER JOIN orders o ON o.id = oi.order_id
  WHERE o.payment_status = 'paid'
    AND o.created_at >= since
  GROUP BY oi.product_id;
$$;
