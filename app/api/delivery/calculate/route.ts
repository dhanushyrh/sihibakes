import { NextResponse } from "next/server";
import {
  getDeliveryFeeSlabs,
  getShopSettings,
} from "@/lib/data";
import { haversineDistanceKm, lookupDeliveryFee } from "@/lib/delivery";
import { getDeliveryFence, isWithinDeliveryFence } from "@/lib/delivery-fence";
import { isBorzoConfigured } from "@/lib/borzo/config";
import { borzoDistanceKm, quoteBorzoDelivery } from "@/lib/borzo/delivery";
import { BorzoApiError } from "@/lib/borzo/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lat, lng, delivery_date, window_start, window_end } = body as {
      lat?: number;
      lng?: number;
      delivery_date?: string;
      window_start?: string;
      window_end?: string;
    };

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const settings = await getShopSettings();
    if (!settings) {
      return NextResponse.json({ error: "Shop not configured" }, { status: 500 });
    }

    const distance = haversineDistanceKm(
      settings.kitchen_lat,
      settings.kitchen_lng,
      lat,
      lng
    );

    const fence = getDeliveryFence(settings);

    if (
      !isWithinDeliveryFence(
        lat,
        lng,
        settings.kitchen_lat,
        settings.kitchen_lng,
        fence
      )
    ) {
      return NextResponse.json({
        distance_km: distance,
        delivery_fee_inr: 0,
        reachable: false,
        message: "We're not reachable at the moment",
      });
    }

    const slot =
      delivery_date && window_start && window_end
        ? { date: delivery_date, windowStart: window_start, windowEnd: window_end }
        : undefined;

    if (isBorzoConfigured()) {
      try {
        const quote = await quoteBorzoDelivery({
          settings,
          customerLat: lat,
          customerLng: lng,
          customerAddress: "Customer delivery location",
          slot,
        });

        if (quote.delivery_fee_inr > 0) {
          return NextResponse.json({
            distance_km: borzoDistanceKm(settings, lat, lng),
            delivery_fee_inr: quote.delivery_fee_inr,
            reachable: true,
            provider: "borzo",
          });
        }
      } catch (err) {
        console.error("Borzo delivery quote failed, falling back to slabs:", err);
        if (err instanceof BorzoApiError && err.status >= 500) {
          return NextResponse.json(
            { error: "Delivery pricing is temporarily unavailable" },
            { status: 503 }
          );
        }
      }
    }

    const slabs = await getDeliveryFeeSlabs();
    const fee = lookupDeliveryFee(distance, slabs);

    return NextResponse.json({
      distance_km: distance,
      delivery_fee_inr: fee,
      reachable: true,
      provider: "slab",
    });
  } catch {
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
