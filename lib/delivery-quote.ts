import { getDeliveryFeeSlabs } from "@/lib/data";
import { haversineDistanceKm, lookupDeliveryFee } from "@/lib/delivery";
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

    return {
      distance_km: borzoDistanceKm(
        params.settings,
        params.customerLat,
        params.customerLng
      ),
      delivery_fee_inr: quote.delivery_fee_inr,
      provider: "borzo",
    };
  }

  const slabs = await getDeliveryFeeSlabs();
  return {
    distance_km: distance,
    delivery_fee_inr: lookupDeliveryFee(distance, slabs),
    provider: "slab",
  };
}
