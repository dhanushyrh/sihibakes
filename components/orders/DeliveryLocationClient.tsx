"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPicker } from "@/components/store/MapPicker";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import { formatCurrency, formatDistance } from "@/lib/delivery";
import type { DeliveryCalculation, DeliveryFenceKm } from "@/lib/types";
import { MapPin, Navigation } from "lucide-react";

type DeliveryLocationClientProps = {
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
};

export function DeliveryLocationClient({
  kitchenLat,
  kitchenLng,
  deliveryFence,
}: DeliveryLocationClientProps) {
  const router = useRouter();
  const { session, setLocation } = useDeliverySession();
  const [lat, setLat] = useState(session.lat ?? kitchenLat + 0.01);
  const [lng, setLng] = useState(session.lng ?? kitchenLng + 0.01);
  const [delivery, setDelivery] = useState<DeliveryCalculation | null>(
    session.delivery
  );
  const [loading, setLoading] = useState(false);

  const calcDelivery = async (newLat: number, newLng: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/delivery/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: newLat, lng: newLng }),
      });
      const data = await res.json();
      setDelivery(data);
      setLocation(newLat, newLng, data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calcDelivery(lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    calcDelivery(newLat, newLng);
  };

  const continueToMenu = () => {
    if (!delivery?.reachable) return;
    router.push("/orders/delivery/menu");
  };

  return (
    <div className="flex min-h-screen flex-col pb-8">
      <OrderFlowHeader title="Delivery address" backHref="/orders" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <div className="mb-5">
          <div className="flex items-center gap-2 text-chocolate">
            <MapPin size={18} className="text-gold" />
            <h2 className="font-medium">Pin your delivery location</h2>
          </div>
          <p className="mt-1 text-sm text-chocolate/60">
            Search for your area or use the map.
          </p>
        </div>

        <MapPicker
          kitchenLat={kitchenLat}
          kitchenLng={kitchenLng}
          lat={lat}
          lng={lng}
          deliveryFence={deliveryFence}
          onChange={handleLocationChange}
        />

        <div className="mt-4">
          {loading ? (
            <p className="rounded-2xl bg-white/60 px-4 py-4 text-center text-sm text-chocolate/50 ring-1 ring-chocolate/10">
              Checking delivery distance...
            </p>
          ) : delivery ? (
            <div
              className={`rounded-2xl px-4 py-4 text-sm ring-1 ${
                delivery.reachable
                  ? "bg-white ring-chocolate/10"
                  : "bg-red-50 text-red-800 ring-red-200"
              }`}
            >
              {delivery.reachable ? (
                <div className="flex items-start gap-3">
                  <Navigation size={18} className="mt-0.5 shrink-0 text-gold" />
                  <div>
                    <p className="font-medium text-chocolate">
                      You&apos;re in our delivery zone
                    </p>
                    <p className="mt-1 text-chocolate/65">
                      {formatDistance(delivery.distance_km)} away · Delivery fee{" "}
                      {formatCurrency(delivery.delivery_fee_inr)}
                    </p>
                  </div>
                </div>
              ) : (
                <p>{delivery.message ?? "Sorry, we can't deliver to this location."}</p>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!delivery?.reachable || loading}
          onClick={continueToMenu}
          className="mt-6 w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream transition hover:bg-chocolate-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to menu
        </button>
      </main>
    </div>
  );
}
