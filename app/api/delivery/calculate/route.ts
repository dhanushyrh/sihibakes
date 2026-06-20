import { NextResponse } from "next/server";
import {
  getDeliveryFeeSlabs,
  getShopSettings,
} from "@/lib/data";
import { haversineDistanceKm, lookupDeliveryFee } from "@/lib/delivery";
import { getDeliveryFence, isWithinDeliveryFence } from "@/lib/delivery-fence";

export async function POST(request: Request) {
  try {
    const { lat, lng } = await request.json();
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

    const slabs = await getDeliveryFeeSlabs();
    const fee = lookupDeliveryFee(distance, slabs);

    return NextResponse.json({
      distance_km: distance,
      delivery_fee_inr: fee,
      reachable: true,
    });
  } catch {
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
