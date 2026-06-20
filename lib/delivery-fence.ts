import type { DeliveryFenceKm, ShopSettings } from "./types";

export const DEFAULT_DELIVERY_FENCE: DeliveryFenceKm = {
  north: 15,
  south: 5,
  east: 15,
  west: 15,
};

const KM_PER_DEG_LAT = 111.32;

function kmPerDegLng(lat: number): number {
  return KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

export interface FenceBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function getDeliveryFence(settings: ShopSettings | null): DeliveryFenceKm {
  if (!settings) return DEFAULT_DELIVERY_FENCE;
  return {
    north: settings.delivery_fence_north_km ?? DEFAULT_DELIVERY_FENCE.north,
    south: settings.delivery_fence_south_km ?? DEFAULT_DELIVERY_FENCE.south,
    east: settings.delivery_fence_east_km ?? DEFAULT_DELIVERY_FENCE.east,
    west: settings.delivery_fence_west_km ?? DEFAULT_DELIVERY_FENCE.west,
  };
}

export function getFenceBounds(
  kitchenLat: number,
  kitchenLng: number,
  fence: DeliveryFenceKm
): FenceBounds {
  const lngScale = kmPerDegLng(kitchenLat);
  return {
    north: kitchenLat + fence.north / KM_PER_DEG_LAT,
    south: kitchenLat - fence.south / KM_PER_DEG_LAT,
    east: kitchenLng + fence.east / lngScale,
    west: kitchenLng - fence.west / lngScale,
  };
}

export function isWithinDeliveryFence(
  lat: number,
  lng: number,
  kitchenLat: number,
  kitchenLng: number,
  fence: DeliveryFenceKm
): boolean {
  const bounds = getFenceBounds(kitchenLat, kitchenLng, fence);
  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west
  );
}

export function maxFenceKm(fence: DeliveryFenceKm): number {
  return Math.max(fence.north, fence.south, fence.east, fence.west);
}

export function formatDeliveryFence(fence: DeliveryFenceKm): string {
  const parts: string[] = [];
  if (fence.north > 0) parts.push(`${fence.north} km north`);
  if (fence.south > 0) parts.push(`${fence.south} km south`);
  if (fence.east > 0) parts.push(`${fence.east} km east`);
  if (fence.west > 0) parts.push(`${fence.west} km west`);
  return parts.join(" · ");
}

export function formatDeliveryFenceShort(fence: DeliveryFenceKm): string {
  const uniq = new Set([fence.north, fence.south, fence.east, fence.west]);
  if (uniq.size === 1) return `${fence.north} km in all directions`;
  return formatDeliveryFence(fence);
}
