-- Directional delivery fence (km from kitchen along each axis)

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS delivery_fence_north_km double precision NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS delivery_fence_south_km double precision NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS delivery_fence_east_km double precision NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS delivery_fence_west_km double precision NOT NULL DEFAULT 15;

-- Backfill from legacy circular radius where defaults apply
UPDATE public.shop_settings
SET
  delivery_fence_north_km = max_delivery_radius_km,
  delivery_fence_east_km = max_delivery_radius_km,
  delivery_fence_west_km = max_delivery_radius_km,
  delivery_fence_south_km = LEAST(max_delivery_radius_km, delivery_fence_south_km)
WHERE delivery_fence_north_km = 15
  AND delivery_fence_south_km = 5
  AND delivery_fence_east_km = 15
  AND delivery_fence_west_km = 15
  AND max_delivery_radius_km IS DISTINCT FROM 15;
