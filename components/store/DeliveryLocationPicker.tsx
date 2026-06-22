"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { DeliveryLocationModal } from "@/components/store/DeliveryLocationModal";
import {
  deliveryUnreachableMessage,
  LocationUnreachableBanner,
} from "@/components/store/LocationUnreachableBanner";
import { SelectedLocationMap } from "@/components/store/SelectedLocationMap";
import { formatCurrency, formatDistance } from "@/lib/delivery";
import { formatCoordinates } from "@/lib/map-location-label";
import type { DeliveryCalculation, DeliveryFenceKm } from "@/lib/types";

type DeliveryLocationPickerProps = {
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
  initialLat: number;
  initialLng: number;
  useGeolocationInitially?: boolean;
  onUpdate: (lat: number, lng: number, delivery: DeliveryCalculation) => void;
};

export function DeliveryLocationPicker({
  kitchenLat,
  kitchenLng,
  deliveryFence,
  initialLat,
  initialLng,
  useGeolocationInitially = false,
  onUpdate,
}: DeliveryLocationPickerProps) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [delivery, setDelivery] = useState<DeliveryCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftLat, setDraftLat] = useState(initialLat);
  const [draftLng, setDraftLng] = useState(initialLng);
  const [locationLabel, setLocationLabel] = useState(() =>
    formatCoordinates(initialLat, initialLng)
  );
  const [draftLocationLabel, setDraftLocationLabel] = useState(locationLabel);
  const geolocationAttempted = useRef(false);

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
    setLat(initialLat);
    setLng(initialLng);
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (geolocationAttempted.current) return;
    geolocationAttempted.current = true;

    if (useGeolocationInitially && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const label = formatCoordinates(latitude, longitude);
          setLat(latitude);
          setLng(longitude);
          setLocationLabel(label);
          void calcDelivery(latitude, longitude);
        },
        () => void calcDelivery(initialLat, initialLng),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 }
      );
      return;
    }

    void calcDelivery(initialLat, initialLng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = () => {
    setDraftLat(lat);
    setDraftLng(lng);
    setDraftLocationLabel(locationLabel);
    setModalOpen(true);
  };

  const confirmModal = () => {
    setLat(draftLat);
    setLng(draftLng);
    setLocationLabel(draftLocationLabel);
    void calcDelivery(draftLat, draftLng);
    setModalOpen(false);
  };

  const isUnreachable = Boolean(delivery && !delivery.reachable);
  const errorMessage = isUnreachable ? deliveryUnreachableMessage(delivery) : null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-chocolate">
        <MapPin size={18} className="text-gold" />
        <h3 className="font-medium">Your delivery location</h3>
      </div>

      {errorMessage && (
        <div className="mb-4">
          <LocationUnreachableBanner message={errorMessage} />
        </div>
      )}

      <SelectedLocationMap
        lat={lat}
        lng={lng}
        kitchenLat={kitchenLat}
        kitchenLng={kitchenLng}
        deliveryFence={deliveryFence}
        onEdit={openModal}
      />

      <p className="mt-2 text-center text-xs text-chocolate/55">{locationLabel}</p>

      {errorMessage && (
        <div className="mt-3">
          <LocationUnreachableBanner message={errorMessage} />
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="rounded-2xl bg-white/60 px-4 py-4 text-center text-sm text-chocolate/50 ring-1 ring-chocolate/10">
            Checking delivery distance...
          </p>
        ) : delivery?.reachable ? (
          <div className="rounded-2xl bg-white px-4 py-4 text-sm ring-1 ring-chocolate/10">
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
          </div>
        ) : null}
      </div>

      {modalOpen && (
        <DeliveryLocationModal
          kitchenLat={kitchenLat}
          kitchenLng={kitchenLng}
          deliveryFence={deliveryFence}
          lat={draftLat}
          lng={draftLng}
          searchLabel={draftLocationLabel}
          onChange={(newLat, newLng) => {
            setDraftLat(newLat);
            setDraftLng(newLng);
          }}
          onSearchLabelChange={setDraftLocationLabel}
          onConfirm={confirmModal}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
