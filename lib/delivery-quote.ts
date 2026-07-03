import { getDeliveryFeeSlabs } from "@/lib/data";
import {
  applyFreeDeliveryKm,
  haversineDistanceKm,
  lookupDeliveryFee,
} from "@/lib/delivery";
import { isBorzoConfigured } from "@/lib/borzo/config";
import { borzoDistanceKm, quoteBorzoDelivery } from "@/lib/borzo/delivery";
import type { BorzoQuoteSlot } from "@/lib/borzo/quote-slot";
import type { ShopSettings } from "@/lib/types";

export type DeliveryQuoteResult = {
  distance_km: number;
  delivery_fee_inr: number;
  provider: "borzo" | "slab";
};

export async function resolveDeliveryQuote(params: {
  settings: ShopSettings;
  customerLat: number;
  customerLng: number;
  customerAddress?: string;
  borzoSlot: BorzoQuoteSlot;
}): Promise<DeliveryQuoteResult> {
  const distance = haversineDistanceKm(
    params.settings.kitchen_lat,
    params.settings.kitchen_lng,
    params.customerLat,
    params.customerLng
  );

  if (isBorzoConfigured()) {
    const quote = await quoteBorzoDelivery({
      settings: params.settings,
      customerLat: params.customerLat,
      customerLng: params.customerLng,
      customerAddress: params.customerAddress ?? "Customer delivery location",
      slot: params.borzoSlot,
    });

    const borzoDistance = borzoDistanceKm(
      params.settings,
      params.customerLat,
      params.customerLng
    );

    return {
      distance_km: borzoDistance,
      delivery_fee_inr: applyFreeDeliveryKm(
        borzoDistance,
        quote.delivery_fee_inr,
        params.settings.free_delivery_km
      ),
      provider: "borzo",
    };
  }

  const slabs = await getDeliveryFeeSlabs();
  const slabFee = lookupDeliveryFee(distance, slabs);
  return {
    distance_km: distance,
    delivery_fee_inr: applyFreeDeliveryKm(
      distance,
      slabFee,
      params.settings.free_delivery_km
    ),
    provider: "slab",
  };
}
