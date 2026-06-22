-- Extend contact_enquiries for kitty party, general, and landing enquiries
ALTER TABLE public.contact_enquiries
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_time time,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill type from legacy source column
UPDATE public.contact_enquiries
SET type = CASE
  WHEN source = 'landing' THEN 'landing'
  ELSE 'general'
END
WHERE type = 'general' AND source IS NOT NULL;

ALTER TABLE public.contact_enquiries
  ADD CONSTRAINT contact_enquiries_type_check
  CHECK (type IN ('kitty_party', 'general', 'landing', 'pre_order'));

ALTER TABLE public.contact_enquiries
  ADD CONSTRAINT contact_enquiries_status_check
  CHECK (status IN ('new', 'in_progress', 'replied', 'closed'));

CREATE TABLE IF NOT EXISTS public.enquiry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.contact_enquiries(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enquiry_items_enquiry_id_idx ON public.enquiry_items(enquiry_id);
CREATE INDEX IF NOT EXISTS contact_enquiries_type_idx ON public.contact_enquiries(type);
CREATE INDEX IF NOT EXISTS contact_enquiries_status_idx ON public.contact_enquiries(status);
CREATE INDEX IF NOT EXISTS contact_enquiries_created_at_idx ON public.contact_enquiries(created_at DESC);

ALTER TABLE public.enquiry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY enquiry_items_admin_select ON public.enquiry_items
  FOR SELECT TO authenticated
  USING (public.is_admin());
