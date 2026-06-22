"use client";

import { useEffect, useState } from "react";
import { X, Navigation } from "lucide-react";
import { MapPicker } from "@/components/store/MapPicker";
import { formatCurrency, formatDistance } from "@/lib/delivery";
import type { DeliveryCalculation, DeliveryFenceKm } from "@/lib/types";

type DeliveryLocationModalProps = {
  open: boolean;
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
  initialLat: number;
  initialLng: number;
  onClose: () => void;
  onConfirm: (lat: number, lng: number, delivery: DeliveryCalculation) => void;
};

export function DeliveryLocationModal({
  open,
  kitchenLat,
  kitchenLng,
  deliveryFence,
  initialLat,
  initialLng,
  onClose,
  onConfirm,
}: DeliveryLocationModalProps) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [delivery, setDelivery] = useState<DeliveryCalculation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLat(initialLat);
    setLng(initialLng);
  }, [open, initialLat, initialLng]);

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
      return data;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void calcDelivery(lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    void calcDelivery(newLat, newLng);
  };

  const handleConfirm = () => {
    if (!delivery?.reachable) return;
    onConfirm(lat, lng, delivery);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="delivery-location-modal-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-cream sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-chocolate/10 px-5 py-4">
          <h2
            id="delivery-location-modal-title"
            className="font-display text-lg font-semibold text-chocolate"
          >
            Change delivery location
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-chocolate ring-1 ring-chocolate/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <p className="mb-4 text-sm text-chocolate/60">
            Search for your area or move the pin. The shaded box is our delivery
            zone.
          </p>

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
                  <p>
                    {delivery.message ??
                      "Sorry, we can't deliver to this location. Please pick a spot inside the delivery zone."}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 border-t border-chocolate/10 bg-cream px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-chocolate/20 py-3.5 text-sm font-medium text-chocolate"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!delivery?.reachable || loading}
            onClick={handleConfirm}
            className="flex-1 rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirm location
          </button>
        </div>
      </div>
    </div>
  );
}
