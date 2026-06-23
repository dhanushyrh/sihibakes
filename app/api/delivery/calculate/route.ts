import { NextResponse } from "next/server";
import {
  getAvailableDeliverySlots,
  getDeliveryFeeSlabs,
  getShopSettings,
} from "@/lib/data";
import { getDefaultDeliverySelection } from "@/lib/customer-delivery-slots";
import { haversineDistanceKm, lookupDeliveryFee } from "@/lib/delivery";
import { getDeliveryFence, isWithinDeliveryFence } from "@/lib/delivery-fence";
import { isBorzoConfigured } from "@/lib/borzo/config";
import { borzoDistanceKm, quoteBorzoDelivery } from "@/lib/borzo/delivery";
import {
  buildBorzoQuoteSlotFromDeliverySlot,
  buildBorzoQuoteSlotFromWindow,
  buildDefaultBorzoQuoteSlot,
} from "@/lib/borzo/quote-slot";
import { BorzoApiError, formatBorzoError } from "@/lib/borzo/client";

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

    const borzoConfigured = isBorzoConfigured();

    if (borzoConfigured) {
      try {
        let borzoSlot;
        if (delivery_date && window_start) {
          borzoSlot = buildBorzoQuoteSlotFromWindow(delivery_date, window_start);
        } else {
          const slots = await getAvailableDeliverySlots();
          const defaultSelection = getDefaultDeliverySelection(slots);
          const nextSlot = slots.find((slot) => slot.id === defaultSelection.slotId);
          borzoSlot = nextSlot
            ? buildBorzoQuoteSlotFromDeliverySlot(nextSlot)
            : buildDefaultBorzoQuoteSlot();
        }

        const quote = await quoteBorzoDelivery({
          settings,
          customerLat: lat,
          customerLng: lng,
          customerAddress: "Customer delivery location",
          slot: borzoSlot,
        });

        return NextResponse.json({
          distance_km: borzoDistanceKm(settings, lat, lng),
          delivery_fee_inr: quote.delivery_fee_inr,
          reachable: true,
          provider: "borzo",
        });
      } catch (err) {
        console.error("Borzo delivery quote failed:", err);

        const message =
          err instanceof BorzoApiError
            ? formatBorzoError(err)
            : err instanceof Error
              ? err.message
              : "Borzo delivery quote failed";

        return NextResponse.json(
          {
            error: message,
            provider: "borzo",
            borzo_configured: true,
          },
          { status: err instanceof BorzoApiError && err.status < 500 ? 400 : 502 }
        );
      }
    }

    const slabs = await getDeliveryFeeSlabs();
    const fee = lookupDeliveryFee(distance, slabs);

    return NextResponse.json({
      distance_km: distance,
      delivery_fee_inr: fee,
      reachable: true,
      provider: "slab",
      borzo_configured: false,
      message:
        process.env.NODE_ENV === "development"
          ? "Using distance slabs — set BORZO_AUTH_TOKEN for live Borzo quotes"
          : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
