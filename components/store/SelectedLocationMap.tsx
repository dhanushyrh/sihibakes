"use client";

import { useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { AdvancedMapMarker } from "@/components/store/AdvancedMapMarker";
import { getGoogleMapsLoaderOptions, withGoogleMapId } from "@/lib/google-maps-config";

const mapContainerStyle = {
  width: "100%",
  height: "200px",
};

type SelectedLocationMapProps = {
  lat: number;
  lng: number;
  kitchenLat?: number;
  kitchenLng?: number;
};

export function SelectedLocationMap({
  lat,
  lng,
  kitchenLat,
  kitchenLng,
}: SelectedLocationMapProps) {
  const apiKey = getGoogleMapsLoaderOptions().googleMapsApiKey;
  const { isLoaded } = useJsApiLoader(getGoogleMapsLoaderOptions());
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
        m.setZoom(16);
      }}
      options={withGoogleMapId({
        disableDefaultUI: true,
        zoomControl: true,
        draggable: true,
        scrollwheel: true,
        disableDoubleClickZoom: false,
        gestureHandling: "greedy",
        clickableIcons: false,
      })}
    >
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
