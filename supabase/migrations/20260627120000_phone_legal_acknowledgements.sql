-- Durable audit trail for Terms & Privacy acknowledgements at phone verification

CREATE TABLE public.phone_legal_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  legal_last_updated text NOT NULL,
  source text NOT NULL CHECK (
    source IN ('checkout', 'landing_contact', 'general_enquiry', 'kitty_party_enquiry')
  ),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

CREATE INDEX phone_legal_ack_phone_accepted_idx
  ON public.phone_legal_acknowledgements (phone, accepted_at DESC);

CREATE INDEX phone_legal_ack_phone_versions_idx
  ON public.phone_legal_acknowledgements (phone, terms_version, privacy_version);

ALTER TABLE public.phone_legal_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY phone_legal_ack_admin_select ON public.phone_legal_acknowledgements
  FOR SELECT TO authenticated
  USING (public.is_admin());
