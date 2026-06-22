"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, LocateFixed } from "lucide-react";
import { DeliveryLocationModal } from "@/components/store/DeliveryLocationModal";
import {
  deliveryUnreachableMessage,
  LocationUnreachableBanner,
} from "@/components/store/LocationUnreachableBanner";
import { SelectedLocationMap } from "@/components/store/SelectedLocationMap";
import { formatCurrency, formatDistance } from "@/lib/delivery";
import {
  geolocationErrorMessage,
  requestCurrentPosition,
} from "@/lib/geolocation";
import { formatCoordinates } from "@/lib/map-location-label";
import type { DeliveryCalculation, DeliveryFenceKm } from "@/lib/types";

export type LocationStatus =
  | "idle"
  | "detecting"
  | "confirmed"
  | "needs_manual";

type DeliveryLocationPickerProps = {
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
  initialLat: number;
  initialLng: number;
  hasSavedLocation?: boolean;
  useGeolocationInitially?: boolean;
  onUpdate: (lat: number, lng: number, delivery: DeliveryCalculation) => void;
  onStatusChange?: (status: LocationStatus) => void;
};

export function DeliveryLocationPicker({
  kitchenLat,
  kitchenLng,
  deliveryFence,
  initialLat,
  initialLng,
  hasSavedLocation = false,
  useGeolocationInitially = false,
  onUpdate,
  onStatusChange,
}: DeliveryLocationPickerProps) {
  const [status, setStatus] = useState<LocationStatus>(
    hasSavedLocation ? "confirmed" : useGeolocationInitially ? "detecting" : "needs_manual"
  );
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [delivery, setDelivery] = useState<DeliveryCalculation | null>(null);
  const [loading, setLoading] = useState(hasSavedLocation);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftLat, setDraftLat] = useState(kitchenLat);
  const [draftLng, setDraftLng] = useState(kitchenLng);
  const [locationLabel, setLocationLabel] = useState(() =>
    hasSavedLocation ? formatCoordinates(initialLat, initialLng) : ""
  );
  const [draftLocationLabel, setDraftLocationLabel] = useState(locationLabel);
  const [geoError, setGeoError] = useState<string | null>(null);
  const initStarted = useRef(false);
  const autoOpenedModal = useRef(false);

  const updateStatus = useCallback(
    (next: LocationStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const calcDelivery = useCallback(
    async (newLat: number, newLng: number) => {
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
        return data;
      } finally {
        setLoading(false);
      }
    },
    [onUpdate]
  );

  const confirmLocation = useCallback(
    async (newLat: number, newLng: number, label: string) => {
      setLat(newLat);
      setLng(newLng);
      setLocationLabel(label);
      setGeoError(null);
      updateStatus("confirmed");
      await calcDelivery(newLat, newLng);
    },
    [calcDelivery, updateStatus]
  );

  const requestGps = useCallback(async () => {
    updateStatus("detecting");
    setGeoError(null);
    setLoading(true);

    try {
      const pos = await requestCurrentPosition();
      const { latitude, longitude } = pos.coords;
      const label = formatCoordinates(latitude, longitude);
      await confirmLocation(latitude, longitude, label);
    } catch (err) {
      setLoading(false);
      const message =
        err instanceof GeolocationPositionError
          ? geolocationErrorMessage(err.code)
          : err instanceof Error
            ? err.message
            : geolocationErrorMessage(0);
      setGeoError(message);
      updateStatus("needs_manual");

      if (!autoOpenedModal.current) {
        autoOpenedModal.current = true;
        setDraftLat(kitchenLat);
        setDraftLng(kitchenLng);
        setDraftLocationLabel("");
        setModalOpen(true);
      }
    }
  }, [confirmLocation, kitchenLat, kitchenLng, updateStatus]);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    if (hasSavedLocation) {
      void calcDelivery(initialLat, initialLng).then(() => {
        updateStatus("confirmed");
      });
      return;
    }

    if (useGeolocationInitially) {
      void requestGps();
      return;
    }

    updateStatus("needs_manual");
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = () => {
    if (status === "confirmed") {
      setDraftLat(lat);
      setDraftLng(lng);
      setDraftLocationLabel(locationLabel);
    } else {
      setDraftLat(kitchenLat);
      setDraftLng(kitchenLng);
      setDraftLocationLabel("");
    }
    setModalOpen(true);
  };

  const confirmModal = () => {
    const label =
      draftLocationLabel.trim() || formatCoordinates(draftLat, draftLng);
    void confirmLocation(draftLat, draftLng, label);
    setModalOpen(false);
  };

  const isConfirmed = status === "confirmed";
  const isUnreachable = Boolean(isConfirmed && delivery && !delivery.reachable);
  const errorMessage = isUnreachable ? deliveryUnreachableMessage(delivery) : null;

  const mapVariant =
    status === "detecting"
      ? "loading"
      : status === "confirmed"
        ? "preview"
        : "empty";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2 text-chocolate">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-gold" />
          <h3 className="font-medium">Your delivery location</h3>
        </div>
        {isConfirmed && delivery?.reachable && (
          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-green-200">
            Delivering here
          </span>
        )}
      </div>

      {status === "needs_manual" && geoError && (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          <p>{geoError}</p>
          <p className="mt-1 text-xs text-amber-900/75">
            Set your delivery pin on the map so we can check if we deliver to you.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openModal}
              className="rounded-full bg-chocolate px-4 py-2 text-xs font-medium text-cream"
            >
              Set on map
            </button>
            <button
              type="button"
              onClick={() => void requestGps()}
              className="rounded-full border border-chocolate/20 px-4 py-2 text-xs text-chocolate"
            >
              Try again
            </button>
          </div>
        </div>
      )}

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
        variant={mapVariant}
        onEdit={openModal}
      />

      {isConfirmed && locationLabel && (
        <p className="mt-2 text-center text-xs text-chocolate/55">{locationLabel}</p>
      )}

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
        ) : isConfirmed && delivery?.reachable ? (
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
        ) : status === "needs_manual" && !geoError ? (
          <button
            type="button"
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-medium text-chocolate ring-1 ring-chocolate/10 transition hover:ring-chocolate/25"
          >
            <LocateFixed size={18} className="text-gold" />
            Set delivery location on map
          </button>
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
