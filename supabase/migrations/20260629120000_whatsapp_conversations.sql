-- Two-way WhatsApp conversations and message storage

CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id text NOT NULL UNIQUE,
  phone text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  display_name text,
  last_customer_message_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_conversations_phone_idx ON public.whatsapp_conversations (phone);
CREATE INDEX whatsapp_conversations_last_message_at_idx
  ON public.whatsapp_conversations (last_message_at DESC NULLS LAST);
CREATE INDEX whatsapp_conversations_unread_idx
  ON public.whatsapp_conversations (unread_count DESC)
  WHERE unread_count > 0;

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  wa_message_id text UNIQUE,
  message_type text NOT NULL,
  body text,
  template_name text,
  payload jsonb,
  status text NOT NULL DEFAULT 'received' CHECK (
    status IN ('received', 'sent', 'delivered', 'read', 'failed')
  ),
  error_message text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_messages_conversation_created_idx
  ON public.whatsapp_messages (conversation_id, created_at ASC);
CREATE INDEX whatsapp_messages_wa_message_id_idx
  ON public.whatsapp_messages (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_conversations_admin_all ON public.whatsapp_conversations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY whatsapp_messages_admin_all ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
