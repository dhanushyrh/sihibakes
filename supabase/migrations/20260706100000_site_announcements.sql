-- Site announcements (customer-facing modal on orders hub)

CREATE TABLE public.site_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  disclaimer text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_announcements_ends_after_starts CHECK (ends_at > starts_at)
);

CREATE INDEX idx_site_announcements_active_window
  ON public.site_announcements (is_active, starts_at, ends_at);

ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active announcements"
  ON public.site_announcements
  FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admin all site_announcements"
  ON public.site_announcements
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.site_announcements (
  title,
  description,
  disclaimer,
  starts_at,
  ends_at,
  is_active
) VALUES (
  'We''re Live! Enjoy 25% OFF on Everything',
  'To celebrate the online launch of Sihi Desserts & Bakes, enjoy 25% OFF on all products plus FREE delivery within 5 km for our first week!',
  'Offer valid till 19th July.',
  '2026-07-06T00:00:00+05:30',
  '2026-07-19T23:59:59+05:30',
  true
);
