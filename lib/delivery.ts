import type { DeliveryFeeSlab } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function lookupDeliveryFee(
  distanceKm: number,
  slabs: DeliveryFeeSlab[]
): number {
  const sorted = [...slabs].sort((a, b) => a.min_km - b.min_km);
  const slab = sorted.find(
    (s) => distanceKm >= s.min_km && distanceKm < s.max_km
  );
  if (slab) return slab.fee_inr;
  const last = sorted[sorted.length - 1];
  if (last && distanceKm >= last.min_km) return last.fee_inr;
  const first = sorted[0];
  return first?.fee_inr ?? 0;
}

export function applyFreeDeliveryKm(
  distanceKm: number,
  feeInr: number,
  freeDeliveryKm: number
): number {
  if (freeDeliveryKm <= 0) return feeInr;
  return distanceKm <= freeDeliveryKm ? 0 : feeInr;
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatCurrency(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatDeliveryFee(amount: number): string {
  return amount === 0 ? "Free delivery" : formatCurrency(amount);
}
