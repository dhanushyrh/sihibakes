-- Update public shop contact / WhatsApp number
UPDATE public.shop_settings
SET
  phone = '8310923990',
  alt_phone = ''
WHERE phone IS NOT NULL OR phone = '';
