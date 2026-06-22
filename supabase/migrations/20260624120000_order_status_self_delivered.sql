-- Add self_delivered fulfillment status for in-house / handoff completions

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'preparing',
    'out_for_delivery',
    'delivered',
    'self_delivered',
    'cancelled'
  ));
