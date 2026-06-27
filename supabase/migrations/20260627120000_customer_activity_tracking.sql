-- Customer activity funnel tracking for market analysis

CREATE TABLE public.customer_activity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text NOT NULL,
  phone text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  first_cart_at timestamptz,
  phone_verified_at timestamptz,
  location_marked_at timestamptz,
  checkout_started_at timestamptz,
  order_created_at timestamptz,
  order_completed_at timestamptz,
  is_order_completed boolean NOT NULL DEFAULT false,
  last_stage text NOT NULL DEFAULT 'cart'
    CHECK (last_stage IN ('cart', 'phone_verified', 'location', 'checkout', 'order_created', 'completed')),
  lat double precision,
  lng double precision,
  delivery_distance_km numeric,
  delivery_fee_inr integer,
  cart_value_inr integer,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.customer_activity_sessions(id) ON DELETE CASCADE,
  event_name text NOT NULL
    CHECK (event_name IN (
      'cart_item_added',
      'phone_verified',
      'location_marked',
      'checkout_started',
      'order_created',
      'order_completed'
    )),
  stage text NOT NULL
    CHECK (stage IN ('cart', 'phone_verified', 'location', 'checkout', 'order_created', 'completed')),
  lat double precision,
  lng double precision,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_sessions_created ON public.customer_activity_sessions(created_at DESC);
CREATE INDEX idx_activity_sessions_completed ON public.customer_activity_sessions(is_order_completed);
CREATE INDEX idx_activity_sessions_stage ON public.customer_activity_sessions(last_stage);
CREATE INDEX idx_activity_sessions_coords ON public.customer_activity_sessions(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX idx_activity_sessions_phone ON public.customer_activity_sessions(phone)
  WHERE phone IS NOT NULL;
CREATE INDEX idx_activity_sessions_anonymous ON public.customer_activity_sessions(anonymous_id);
CREATE INDEX idx_activity_events_session ON public.customer_activity_events(session_id, created_at DESC);
CREATE INDEX idx_activity_events_created ON public.customer_activity_events(created_at DESC);

ALTER TABLE public.customer_activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read activity sessions" ON public.customer_activity_sessions
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin read activity events" ON public.customer_activity_events
  FOR SELECT USING (public.is_admin());
