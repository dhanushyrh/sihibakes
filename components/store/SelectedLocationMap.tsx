"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Rectangle, useJsApiLoader } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { AdvancedMapMarker } from "@/components/store/AdvancedMapMarker";
import { getFenceBounds } from "@/lib/delivery-fence";
import type { DeliveryFenceKm } from "@/lib/types";
import { getGoogleMapsLoaderOptions, withGoogleMapId } from "@/lib/google-maps-config";

const mapContainerStyle = {
  width: "100%",
  height: "200px",
};

const LOCKED_ZOOM = 16;

export type SelectedLocationMapVariant = "preview" | "empty" | "loading";

type SelectedLocationMapProps = {
  lat: number;
  lng: number;
  kitchenLat?: number;
  kitchenLng?: number;
  deliveryFence?: DeliveryFenceKm;
  variant?: SelectedLocationMapVariant;
  onEdit?: () => void;
};

export function SelectedLocationMap({
  lat,
  lng,
  kitchenLat,
  kitchenLng,
  deliveryFence,
  variant = "preview",
  onEdit,
}: SelectedLocationMapProps) {
  const apiKey = getGoogleMapsLoaderOptions().googleMapsApiKey;
  const { isLoaded } = useJsApiLoader(getGoogleMapsLoaderOptions());
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const fenceBounds = useMemo(() => {
    if (!deliveryFence || kitchenLat == null || kitchenLng == null) return null;
    return getFenceBounds(kitchenLat, kitchenLng, deliveryFence);
  }, [deliveryFence, kitchenLat, kitchenLng]);

  useEffect(() => {
    if (variant !== "preview") return;
    map?.panTo({ lat, lng });
  }, [lat, lng, map, variant]);

  if (variant === "loading") {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center rounded-2xl bg-cream ring-1 ring-chocolate/10">
        <div className="mb-3 h-10 w-10 animate-pulse rounded-full bg-chocolate/10" />
        <p className="text-sm text-chocolate/50">Finding your location...</p>
      </div>
    );
  }

  if (variant === "empty") {
    const emptyContent = (
      <div className="flex h-[200px] flex-col items-center justify-center rounded-2xl bg-cream px-4 text-center ring-1 ring-chocolate/10">
        <MapPin size={28} className="mb-2 text-chocolate/35" />
        <p className="text-sm font-medium text-chocolate">Set your delivery pin</p>
        <p className="mt-1 text-xs text-chocolate/50">
          We need your location to calculate delivery fee
        </p>
      </div>
    );

    if (!onEdit) return emptyContent;

    return (
      <button
        type="button"
        onClick={onEdit}
        className="group block w-full text-left transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-chocolate/40"
        aria-label="Set delivery location"
      >
        {emptyContent}
      </button>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center bg-cream px-4 text-center text-sm text-chocolate/60">
        <MapPin size={20} className="mb-2 text-chocolate/40" />
        <p>Location pinned</p>
        <p className="mt-1 text-xs text-chocolate/45">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[200px] items-center justify-center bg-cream">
        <p className="text-sm text-chocolate/50">Loading map...</p>
      </div>
    );
  }

  const mapView = (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      onLoad={(m) => {
        setMap(m);
        m.setCenter({ lat, lng });
        m.setZoom(LOCKED_ZOOM);
      }}
      options={withGoogleMapId({
        disableDefaultUI: true,
        zoomControl: false,
        draggable: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
        gestureHandling: "none",
        clickableIcons: false,
        minZoom: LOCKED_ZOOM,
        maxZoom: LOCKED_ZOOM,
      })}
    >
      {fenceBounds && (
        <Rectangle
          bounds={fenceBounds}
          options={{
            fillColor: "#4B2C20",
            fillOpacity: 0.07,
            strokeColor: "#4B2C20",
            strokeOpacity: 0.35,
            strokeWeight: 2,
            clickable: false,
          }}
        />
      )}
      {kitchenLat != null && kitchenLng != null && (
        <AdvancedMapMarker
          lat={kitchenLat}
          lng={kitchenLng}
          variant="kitchen"
          title="Kitchen"
          zIndex={1}
        />
      )}
      <AdvancedMapMarker
        lat={lat}
        lng={lng}
        title="Your delivery location"
        zIndex={2}
      />
    </GoogleMap>
  );

  if (!onEdit) {
    return mapView;
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className="group relative block w-full overflow-hidden rounded-2xl text-left ring-1 ring-chocolate/10 transition hover:ring-chocolate/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-chocolate/40"
      aria-label="Change delivery location"
    >
      {mapView}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-chocolate/50 to-transparent px-3 pb-3 pt-10">
        <span className="inline-flex rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-chocolate shadow-sm">
          Tap to change location
        </span>
      </div>
    </button>
  );
}
