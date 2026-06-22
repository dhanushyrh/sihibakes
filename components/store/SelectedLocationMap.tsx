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

type SelectedLocationMapProps = {
  lat: number;
  lng: number;
  kitchenLat?: number;
  kitchenLng?: number;
  deliveryFence?: DeliveryFenceKm;
};

export function SelectedLocationMap({
  lat,
  lng,
  kitchenLat,
  kitchenLng,
  deliveryFence,
}: SelectedLocationMapProps) {
  const apiKey = getGoogleMapsLoaderOptions().googleMapsApiKey;
  const { isLoaded } = useJsApiLoader(getGoogleMapsLoaderOptions());
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const fenceBounds = useMemo(() => {
    if (!deliveryFence || kitchenLat == null || kitchenLng == null) return null;
    return getFenceBounds(kitchenLat, kitchenLng, deliveryFence);
  }, [deliveryFence, kitchenLat, kitchenLng]);

  useEffect(() => {
    map?.panTo({ lat, lng });
  }, [lat, lng, map]);

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

  return (
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
}
