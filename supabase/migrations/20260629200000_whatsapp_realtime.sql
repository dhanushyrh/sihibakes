-- Enable Supabase Realtime for WhatsApp chat tables (admin RLS still applies)

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
