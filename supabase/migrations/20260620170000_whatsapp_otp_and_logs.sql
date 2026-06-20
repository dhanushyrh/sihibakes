-- Persistent OTP storage (serverless-safe) and WhatsApp message logs

CREATE TABLE phone_otps (
  phone text PRIMARY KEY,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE phone_verifications (
  phone text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE whatsapp_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  message_type text NOT NULL,
  template_name text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message text,
  whatsapp_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_message_log_order_id_idx ON whatsapp_message_log (order_id);
CREATE INDEX whatsapp_message_log_phone_created_idx ON whatsapp_message_log (phone, created_at DESC);

ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_log ENABLE ROW LEVEL SECURITY;
