"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, LocateFixed } from "lucide-react";
import { DeliveryLocationModal } from "@/components/store/DeliveryLocationModal";
import { LocationPlaceSearch } from "@/components/store/LocationPlaceSearch";
import { MapPicker } from "@/components/store/MapPicker";
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
  variant?: "default" | "gate";
  onUpdate: (lat: number, lng: number, delivery: DeliveryCalculation | null) => void;
  onStatusChange?: (status: LocationStatus) => void;
  onUnreachableExit?: () => void;
};

const GATE_MAP_HEIGHT = 280;

export function DeliveryLocationPicker({
  kitchenLat,
  kitchenLng,
  deliveryFence,
  initialLat,
  initialLng,
  hasSavedLocation = false,
  useGeolocationInitially = false,
  variant = "default",
  onUpdate,
  onStatusChange,
  onUnreachableExit,
}: DeliveryLocationPickerProps) {
  const isGate = variant === "gate";
  const mapHeight = isGate ? GATE_MAP_HEIGHT : undefined;

  const [status, setStatus] = useState<LocationStatus>(
    hasSavedLocation ? "confirmed" : useGeolocationInitially && !isGate ? "detecting" : "needs_manual"
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
  const [showMap, setShowMap] = useState(hasSavedLocation);
  const [interactiveMap, setInteractiveMap] = useState(false);
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
        const data = (await res.json()) as DeliveryCalculation & { error?: string };
        if (!res.ok) {
          const message = data.error || "Could not calculate delivery fee";
          setGeoError(message);
          setDelivery(null);
          onUpdate(newLat, newLng, null);
          return null;
        }
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
      setShowMap(true);
      setInteractiveMap(false);
      updateStatus("confirmed");
      await calcDelivery(newLat, newLng);
    },
    [calcDelivery, updateStatus]
  );

  const requestGps = useCallback(async () => {
    setShowMap(true);
    setInteractiveMap(false);
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

      if (!isGate && !autoOpenedModal.current) {
        autoOpenedModal.current = true;
        setDraftLat(kitchenLat);
        setDraftLng(kitchenLng);
        setDraftLocationLabel("");
        setModalOpen(true);
      }
    }
  }, [confirmLocation, isGate, kitchenLat, kitchenLng, updateStatus]);

  const handleSearchSelect = useCallback(
    (newLat: number, newLng: number, label: string) => {
      void confirmLocation(newLat, newLng, label);
    },
    [confirmLocation]
  );

  const openInteractiveMap = useCallback(() => {
    setShowMap(true);
    setInteractiveMap(true);
    setGeoError(null);
    const startLat = status === "confirmed" ? lat : kitchenLat;
    const startLng = status === "confirmed" ? lng : kitchenLng;
    setLat(startLat);
    setLng(startLng);
    if (status !== "confirmed") {
      updateStatus("needs_manual");
    }
  }, [kitchenLat, kitchenLng, lat, lng, status, updateStatus]);

  const handleInteractiveChange = useCallback(
    (newLat: number, newLng: number) => {
      void confirmLocation(newLat, newLng, formatCoordinates(newLat, newLng));
    },
    [confirmLocation]
  );

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    if (hasSavedLocation) {
      void calcDelivery(initialLat, initialLng).then(() => {
        updateStatus("confirmed");
        setShowMap(true);
      });
      return;
    }

    if (isGate) {
      updateStatus("needs_manual");
      setLoading(false);
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
      : status === "confirmed" || showMap
        ? "preview"
        : "empty";

  const gateActionButtons = (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={() => void requestGps()}
        disabled={status === "detecting"}
        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-chocolate/20 py-3.5 text-sm text-chocolate transition hover:bg-white disabled:opacity-50"
      >
        <LocateFixed size={18} className="text-gold" />
        {status === "detecting" ? "Finding location..." : "Use my location"}
      </button>
      <button
        type="button"
        onClick={openInteractiveMap}
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-medium text-chocolate ring-1 ring-chocolate/10 transition hover:ring-chocolate/25"
      >
        <MapPin size={18} className="text-gold" />
        Select on map
      </button>
    </div>
  );

  const gateMapSection = showMap && (
    <div className="mt-4">
      {interactiveMap ? (
          <MapPicker
            kitchenLat={kitchenLat}
            kitchenLng={kitchenLng}
            lat={lat}
            lng={lng}
            deliveryFence={deliveryFence}
            initialView="marker"
            showSearch={false}
          showUseLocationButton={false}
          showHint={false}
          mapHeight={GATE_MAP_HEIGHT}
          onChange={handleInteractiveChange}
        />
      ) : (
        <SelectedLocationMap
          lat={lat}
          lng={lng}
          kitchenLat={kitchenLat}
          kitchenLng={kitchenLng}
          deliveryFence={deliveryFence}
          variant={mapVariant}
          mapHeight={mapHeight}
          onEdit={openInteractiveMap}
        />
      )}
    </div>
  );

  if (isGate) {
    return (
      <div>
        {isConfirmed && delivery?.reachable && (
          <div className="mb-4 flex justify-end">
            <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-green-200">
              Delivering here
            </span>
          </div>
        )}

        <LocationPlaceSearch
          kitchenLat={kitchenLat}
          kitchenLng={kitchenLng}
          deliveryFence={deliveryFence}
          value={locationLabel}
          onPlaceSelect={handleSearchSelect}
        />

        {geoError && (
          <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            <p>{geoError}</p>
          </div>
        )}

        <div className="mt-3">{gateActionButtons}</div>

        {errorMessage && (
          <div className="mt-4">
            <LocationUnreachableBanner message={errorMessage} />
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={openInteractiveMap}
                className="w-full rounded-full border border-chocolate/20 py-3.5 text-sm text-chocolate"
              >
                Try another location
              </button>
              {onUnreachableExit && (
                <button
                  type="button"
                  onClick={onUnreachableExit}
                  className="w-full rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream"
                >
                  Browse menu
                </button>
              )}
            </div>
          </div>
        )}

        {gateMapSection}

        {isConfirmed && locationLabel && !isUnreachable && (
          <p className="mt-2 text-center text-xs text-chocolate/55">{locationLabel}</p>
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
          ) : null}
        </div>
      </div>
    );
  }

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
        mapHeight={mapHeight}
        onEdit={openModal}
      />

      {isConfirmed && locationLabel && !isUnreachable && (
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
