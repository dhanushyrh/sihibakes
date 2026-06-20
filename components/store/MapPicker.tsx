"use client";

import {
  Autocomplete,
  GoogleMap,
  Marker,
  Rectangle,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useCallback, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import {
  formatDeliveryFenceShort,
  getFenceBounds,
} from "@/lib/delivery-fence";
import type { DeliveryFenceKm } from "@/lib/types";
import { getGoogleMapsLoaderOptions } from "@/lib/google-maps-config";

const mapContainerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "1rem",
};

interface MapPickerProps {
  kitchenLat: number;
  kitchenLng: number;
  lat: number;
  lng: number;
  deliveryFence?: DeliveryFenceKm;
  onChange: (lat: number, lng: number) => void;
}

export function MapPicker({
  kitchenLat,
  kitchenLng,
  lat,
  lng,
  deliveryFence,
  onChange,
}: MapPickerProps) {
  const apiKey = getGoogleMapsLoaderOptions().googleMapsApiKey;
  const { isLoaded } = useJsApiLoader(getGoogleMapsLoaderOptions());
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [searchValue, setSearchValue] = useState("");

  const fenceBounds = useMemo(() => {
    if (!deliveryFence) return null;
    return getFenceBounds(kitchenLat, kitchenLng, deliveryFence);
  }, [deliveryFence, kitchenLat, kitchenLng]);

  const searchBounds = useMemo(() => {
    if (!isLoaded || typeof google === "undefined") return undefined;
    if (fenceBounds) {
      return new google.maps.LatLngBounds(
        { lat: fenceBounds.south, lng: fenceBounds.west },
        { lat: fenceBounds.north, lng: fenceBounds.east }
      );
    }
    const circle = new google.maps.Circle({
      center: { lat: kitchenLat, lng: kitchenLng },
      radius: 25_000,
    });
    return circle.getBounds() ?? undefined;
  }, [isLoaded, fenceBounds, kitchenLat, kitchenLng]);

  const movePin = useCallback(
    (newLat: number, newLng: number, zoom = 15) => {
      onChange(newLat, newLng);
      map?.panTo({ lat: newLat, lng: newLng });
      if (zoom) map?.setZoom(zoom);
    },
    [map, onChange]
  );

  const onLoad = useCallback(
    (m: google.maps.Map) => {
      setMap(m);
      if (fenceBounds) {
        m.fitBounds(
          new google.maps.LatLngBounds(
            { lat: fenceBounds.south, lng: fenceBounds.west },
            { lat: fenceBounds.north, lng: fenceBounds.east }
          ),
          40
        );
      }
    },
    [fenceBounds]
  );

  const onPlaceChanged = () => {
    const place = autocomplete?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return;

    const newLat = loc.lat();
    const newLng = loc.lng();
    setSearchValue(place.formatted_address ?? place.name ?? "");
    movePin(newLat, newLng, 15);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setSearchValue("Current location");
      movePin(pos.coords.latitude, pos.coords.longitude, 15);
    });
  };

  if (!apiKey) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center rounded-2xl bg-[#F5E6D3] p-4 text-center text-sm text-[#4B2C20]/70">
        <MapPin className="mb-2" />
        <p>Google Maps API key not configured.</p>
        <p className="mt-2 text-xs">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env</p>
        <button
          type="button"
          onClick={() => onChange(kitchenLat + 0.01, kitchenLng + 0.01)}
          className="mt-3 rounded-full bg-[#4B2C20] px-4 py-2 text-xs text-white"
        >
          Use demo location
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl bg-[#F5E6D3]">
        <p className="text-sm text-[#4B2C20]/50">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Autocomplete
        onLoad={setAutocomplete}
        onPlaceChanged={onPlaceChanged}
        options={{
          bounds: searchBounds,
          strictBounds: false,
          componentRestrictions: { country: "in" },
          fields: ["geometry", "formatted_address", "name"],
        }}
      >
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B2C20]/40"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search area, street, or landmark"
            className="w-full rounded-2xl border border-[#4B2C20]/15 bg-white py-3 pl-10 pr-4 text-sm text-[#4B2C20] placeholder:text-[#4B2C20]/40 ring-1 ring-[#4B2C20]/5 focus:border-[#4B2C20]/30 focus:outline-none focus:ring-2 focus:ring-[#4B2C20]/10"
          />
        </div>
      </Autocomplete>

      <div className="overflow-hidden rounded-2xl ring-1 ring-[#4B2C20]/10">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={{ lat, lng }}
          zoom={14}
          onLoad={onLoad}
          onClick={(e) => {
            if (e.latLng) movePin(e.latLng.lat(), e.latLng.lng(), 0);
          }}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
          }}
        >
          {fenceBounds && (
            <Rectangle
              bounds={fenceBounds}
              options={{
                fillColor: "#4B2C20",
                fillOpacity: 0.07,
                strokeColor: "#4B2C20",
                strokeOpacity: 0.4,
                strokeWeight: 2,
                clickable: false,
              }}
            />
          )}

          <Marker
            position={{ lat: kitchenLat, lng: kitchenLng }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4B2C20",
              fillOpacity: 0.55,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            }}
            title="Kitchen"
            zIndex={1}
          />

          <Marker
            position={{ lat, lng }}
            draggable
            onDragEnd={(e) => {
              if (e.latLng) {
                setSearchValue("");
                onChange(e.latLng.lat(), e.latLng.lng());
              }
            }}
            zIndex={2}
          />
        </GoogleMap>
      </div>

      {deliveryFence && (
        <p className="text-center text-xs text-[#4B2C20]/50">
          Shaded area is our delivery zone —{" "}
          {formatDeliveryFenceShort(deliveryFence)} from the kitchen
        </p>
      )}

      <button
        type="button"
        onClick={useMyLocation}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#4B2C20]/20 py-2.5 text-sm text-[#4B2C20] transition hover:bg-white"
      >
        <MapPin size={16} />
        Use my location
      </button>

      <p className="text-center text-xs text-[#4B2C20]/50">
        Search for your area, then tap the map or drag the pin to fine-tune
      </p>
    </div>
  );
}
