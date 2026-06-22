"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { MapPicker } from "@/components/store/MapPicker";
import { formatCurrency, formatDistance } from "@/lib/delivery";
import type { ParsedMapAddress } from "@/lib/map-address";
import type { DeliveryCalculation, DeliveryFenceKm } from "@/lib/types";

type DeliveryLocationPickerProps = {
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
  initialLat: number;
  initialLng: number;
  onUpdate: (lat: number, lng: number, delivery: DeliveryCalculation) => void;
  onAddressPrefill?: (address: ParsedMapAddress) => void;
};

export function DeliveryLocationPicker({
  kitchenLat,
  kitchenLng,
  deliveryFence,
  initialLat,
  initialLng,
  onUpdate,
  onAddressPrefill,
}: DeliveryLocationPickerProps) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [delivery, setDelivery] = useState<DeliveryCalculation | null>(null);
  const [loading, setLoading] = useState(false);

  const calcDelivery = async (newLat: number, newLng: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/delivery/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: newLat, lng: newLng }),
      });
      const data = (await res.json()) as DeliveryCalculation;
      setDelivery(data);
      onUpdate(newLat, newLng, data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void calcDelivery(initialLat, initialLng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    void calcDelivery(newLat, newLng);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-chocolate">
        <MapPin size={18} className="text-gold" />
        <h3 className="font-medium">Pin your delivery location</h3>
      </div>
      <p className="mb-4 text-sm text-chocolate/60">
        Search for your area, drag the pin, or tap the map to set your spot.
      </p>

      <MapPicker
        kitchenLat={kitchenLat}
        kitchenLng={kitchenLng}
        lat={lat}
        lng={lng}
        deliveryFence={deliveryFence}
        onChange={handleLocationChange}
        onAddressResolved={onAddressPrefill}
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
              <p>
                {delivery.message ??
                  "Sorry, we can't deliver to this location. Please pick a spot inside the delivery zone."}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
