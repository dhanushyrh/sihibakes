-- Enrich customer activity tracking with identity, device, cart snapshots, and latest profile per phone

ALTER TABLE public.customer_activity_sessions
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS device_type text
    CHECK (device_type IS NULL OR device_type IN ('mobile', 'tablet', 'desktop', 'bot', 'unknown')),
  ADD COLUMN IF NOT EXISTS browser_name text,
  ADD COLUMN IF NOT EXISTS os_name text,
  ADD COLUMN IF NOT EXISTS cart_items jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cart_items_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cart_snapshot_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_activity_sessions_email
  ON public.customer_activity_sessions(email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_sessions_device_type
  ON public.customer_activity_sessions(device_type)
  WHERE device_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_sessions_ip_hash
  ON public.customer_activity_sessions(ip_hash)
  WHERE ip_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_activity_profiles (
  phone text PRIMARY KEY,
  latest_session_id uuid REFERENCES public.customer_activity_sessions(id) ON DELETE SET NULL,
  full_name text,
  email text,
  last_lat double precision,
  last_lng double precision,
  last_device_type text
    CHECK (last_device_type IS NULL OR last_device_type IN ('mobile', 'tablet', 'desktop', 'bot', 'unknown')),
  last_cart_items jsonb NOT NULL DEFAULT '[]',
  last_cart_value_inr integer,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  order_completed_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_profiles_last_seen
  ON public.customer_activity_profiles(last_seen_at DESC);

ALTER TABLE public.customer_activity_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read activity profiles" ON public.customer_activity_profiles
  FOR SELECT USING (public.is_admin());
