-- Customer reviews (landing + orders hub)

CREATE TABLE public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text NOT NULL DEFAULT '',
  product text NOT NULL DEFAULT '',
  rating smallint NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  quote text NOT NULL,
  image_path text,
  reviewed_at date NOT NULL DEFAULT CURRENT_DATE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_reviews_active_sort
  ON public.customer_reviews (is_active, sort_order, reviewed_at DESC);

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active reviews"
  ON public.customer_reviews
  FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admin all customer_reviews"
  ON public.customer_reviews
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.customer_reviews (
  name, area, product, rating, quote, image_path, reviewed_at, sort_order
) VALUES
  (
    'Ananya R.',
    'Indiranagar',
    'Classic Tiramisu',
    5,
    'The layers are insane — creamy, coffee-rich, and not too sweet. Ordered for a dinner party and everyone asked where it''s from!',
    '/landing/hero-scoop.png',
    '2025-03-12',
    1
  ),
  (
    'Rohit K.',
    'HSR Layout',
    'Tres Leches',
    5,
    'Soaked perfectly and melts in your mouth. You can tell it''s made fresh — delivery was on time and beautifully packed.',
    '/landing/tres-leches.png',
    '2025-04-02',
    2
  ),
  (
    'Meera S.',
    'Koramangala',
    'Tres Leches Slice',
    5,
    'The cake that actually melts! Shared this with family and it was gone in minutes. Already planning my next order.',
    '/landing/tres-leches-slice.png',
    '2025-04-18',
    3
  ),
  (
    'Divya P.',
    'Whitefield',
    'Classic Tiramisu',
    5,
    'Every layer tells a story — you can see the care in how it''s packed and presented. My new go-to for celebrations.',
    '/landing/layers-story.png',
    '2025-05-06',
    4
  );
