-- Allow barter collab as an offline payment mode

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_mode_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_mode_check
  CHECK (
    payment_mode IS NULL
    OR payment_mode IN ('cash', 'upi', 'bank_transfer', 'other', 'barter_collab')
  );
