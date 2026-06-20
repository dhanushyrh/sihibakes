-- Store contact & compliance details on shop_settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS store_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fssai_license_no text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS alt_phone text NOT NULL DEFAULT '';
