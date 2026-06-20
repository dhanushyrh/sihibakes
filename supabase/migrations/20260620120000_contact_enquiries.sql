-- Contact form submissions from the landing page
CREATE TABLE public.contact_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'landing',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;

-- Only admins can read enquiries; inserts go through the API (service role)
CREATE POLICY contact_enquiries_admin_select ON public.contact_enquiries
  FOR SELECT TO authenticated
  USING (public.is_admin());
