-- In-app admin alerts for operational failures (e.g. WhatsApp send errors)

CREATE TABLE public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  metadata jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_alerts_unacked_idx ON public.admin_alerts (created_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE INDEX admin_alerts_order_id_idx ON public.admin_alerts (order_id);

ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin all admin_alerts"
  ON public.admin_alerts
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
