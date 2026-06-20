-- Refund amount and transaction reference

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refund_amount_inr integer,
  ADD COLUMN IF NOT EXISTS refund_txn_id text;
