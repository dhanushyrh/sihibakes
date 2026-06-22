import { DEFAULT_KITCHEN, STORE_CONTACT } from "@/lib/constants";
import { getDeliveryFence } from "@/lib/delivery-fence";
import type { DeliveryFenceKm, ShopSettings } from "@/lib/types";

export type StorefrontDetails = {
  store_address: string;
  fssai_license_no: string;
  phone: string;
  alt_phone: string;
  max_delivery_radius_km: number;
  delivery_fence: DeliveryFenceKm;
  kitchen_lat: number;
  kitchen_lng: number;
};

export type StoreContactDetails = {
  store_address?: string;
  fssai_license_no?: string;
  phone?: string;
  alt_phone?: string;
};

export function getStorefrontDetails(
  settings: ShopSettings | null
): StorefrontDetails {
  return {
    store_address: settings?.store_address?.trim() ?? "",
    fssai_license_no: settings?.fssai_license_no?.trim() ?? "",
    phone: normalizePhone(settings?.phone?.trim() ?? "") || STORE_CONTACT.phone,
    alt_phone: normalizePhone(settings?.alt_phone?.trim() ?? ""),
    max_delivery_radius_km: settings?.max_delivery_radius_km ?? 15,
    delivery_fence: getDeliveryFence(settings),
    kitchen_lat: settings?.kitchen_lat ?? DEFAULT_KITCHEN.lat,
    kitchen_lng: settings?.kitchen_lng ?? DEFAULT_KITCHEN.lng,
  };
}

export function toStoreContact(
  details: StorefrontDetails
): StoreContactDetails {
  return {
    store_address: details.store_address || undefined,
    fssai_license_no: details.fssai_license_no || undefined,
    phone: details.phone || undefined,
    alt_phone: details.alt_phone || undefined,
  };
}

export function getDeliveryAreaLabel(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return "Your neighbourhood";

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const last = parts[parts.length - 1]!;
    return last.length <= 32 ? last : parts[parts.length - 2] ?? "Your area";
  }

  return trimmed.length <= 28 ? trimmed : "Near our kitchen";
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function telHref(phone: string): string {
  const digits = normalizePhone(phone);
  return digits ? `tel:+91${digits}` : "tel:";
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 10) return digits;
  return digits.slice(-10);
}

/** Single canonical display: +91 XXXXXXXXXX */
export function formatDisplayPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length !== 10) return "";
  return `+91 ${digits}`;
}

export function whatsappHref(phone: string, message?: string): string {
  const digits = normalizePhone(phone);
  if (!digits) return "https://wa.me/";
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  const base = `https://wa.me/${withCountry}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function instagramHref(): string {
  const url = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();
  if (url) return url.startsWith("http") ? url : `https://${url}`;
  return STORE_CONTACT.instagramUrl;
}

export function hasStoreContact(details: StorefrontDetails): boolean {
  return Boolean(
    details.store_address ||
      details.fssai_license_no ||
      details.phone ||
      details.alt_phone
  );
}
