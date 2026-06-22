-- Delivery partner vendors for out-for-delivery dispatch

CREATE TABLE public.delivery_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active delivery_vendors"
  ON public.delivery_vendors FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admin all delivery_vendors"
  ON public.delivery_vendors FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.delivery_vendors (name, sort_order) VALUES
  ('Rapido', 1),
  ('Swiggy Genie', 2),
  ('Portor', 3);
