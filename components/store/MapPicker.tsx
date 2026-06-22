"use client";

import {
  Autocomplete,
  GoogleMap,
  Rectangle,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { AdvancedMapMarker } from "@/components/store/AdvancedMapMarker";
import { getFenceBounds } from "@/lib/delivery-fence";
import {
  geolocationErrorMessage,
  requestCurrentPosition,
} from "@/lib/geolocation";
import { getGoogleMapsLoaderOptions, withGoogleMapId } from "@/lib/google-maps-config";
import {
  formatCoordinates,
  labelFromPlace,
  locationLabelForCoords,
} from "@/lib/map-location-label";
import type { DeliveryFenceKm } from "@/lib/types";

const mapContainerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "1rem",
};

const PIN_ZOOM = 16;

interface MapPickerProps {
  kitchenLat: number;
  kitchenLng: number;
  lat: number;
  lng: number;
  deliveryFence?: DeliveryFenceKm;
  searchLabel?: string;
  onChange: (lat: number, lng: number) => void;
  onSearchLabelChange?: (label: string) => void;
}

export function MapPicker({
  kitchenLat,
  kitchenLng,
  lat,
  lng,
  deliveryFence,
  searchLabel,
  onChange,
  onSearchLabelChange,
}: MapPickerProps) {
  const apiKey = getGoogleMapsLoaderOptions().googleMapsApiKey;
  const { isLoaded } = useJsApiLoader(getGoogleMapsLoaderOptions());
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [searchValue, setSearchValue] = useState(
    searchLabel ?? formatCoordinates(lat, lng)
  );
  const [editingSearch, setEditingSearch] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

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

  const applyLabel = useCallback(
    (label: string) => {
      setSearchValue(label);
      onSearchLabelChange?.(label);
    },
    [onSearchLabelChange]
  );

  const movePin = useCallback(
    (newLat: number, newLng: number, label: string) => {
      onChange(newLat, newLng);
      applyLabel(label);
      map?.panTo({ lat: newLat, lng: newLng });
    },
    [map, onChange, applyLabel]
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
      } else {
        m.setCenter({ lat, lng });
        m.setZoom(PIN_ZOOM);
      }
    },
    [fenceBounds, lat, lng]
  );

  useEffect(() => {
    if (!map || fenceBounds) return;
    map.panTo({ lat, lng });
  }, [lat, lng, map, fenceBounds]);

  useEffect(() => {
    if (editingSearch || searchLabel === undefined) return;
    setSearchValue(searchLabel);
  }, [searchLabel, editingSearch]);

  const onPlaceChanged = () => {
    const place = autocomplete?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return;

    const newLat = loc.lat();
    const newLng = loc.lng();
    const label = locationLabelForCoords(newLat, newLng, labelFromPlace(place));
    setEditingSearch(false);
    movePin(newLat, newLng, label);
  };

  const useMyLocation = async () => {
    setGeoError(null);
    setDetectingLocation(true);
    try {
      const pos = await requestCurrentPosition();
      const { latitude, longitude } = pos.coords;
      setEditingSearch(false);
      movePin(latitude, longitude, formatCoordinates(latitude, longitude));
    } catch (err) {
      const message =
        err instanceof GeolocationPositionError
          ? geolocationErrorMessage(err.code)
          : err instanceof Error
            ? err.message
            : geolocationErrorMessage(0);
      setGeoError(message);
    } finally {
      setDetectingLocation(false);
    }
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
            type="search"
            enterKeyHint="search"
            value={searchValue}
            onChange={(e) => {
              setEditingSearch(true);
              setSearchValue(e.target.value);
            }}
            onFocus={() => setEditingSearch(true)}
            onBlur={() => setEditingSearch(false)}
            placeholder="Search area, street, or landmark"
            className="w-full rounded-2xl border border-[#4B2C20]/15 bg-white py-3 pl-10 pr-4 text-base text-[#4B2C20] placeholder:text-[#4B2C20]/40 ring-1 ring-[#4B2C20]/5 focus:border-[#4B2C20]/30 focus:outline-none focus:ring-2 focus:ring-[#4B2C20]/10"
          />
        </div>
      </Autocomplete>

      <div className="overflow-hidden rounded-2xl ring-1 ring-[#4B2C20]/10">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          onLoad={onLoad}
          onClick={(e) => {
            if (!e.latLng) return;
            setEditingSearch(false);
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            movePin(newLat, newLng, formatCoordinates(newLat, newLng));
          }}
          options={withGoogleMapId({
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
            draggable: true,
          })}
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

          <AdvancedMapMarker
            lat={kitchenLat}
            lng={kitchenLng}
            variant="kitchen"
            title="Kitchen"
            zIndex={1}
          />

          <AdvancedMapMarker
            lat={lat}
            lng={lng}
            draggable
            title="Delivery location"
            zIndex={2}
            onDragEnd={(newLat, newLng) => {
              setEditingSearch(false);
              movePin(newLat, newLng, formatCoordinates(newLat, newLng));
            }}
          />
        </GoogleMap>
      </div>

      <button
        type="button"
        onClick={() => void useMyLocation()}
        disabled={detectingLocation}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#4B2C20]/20 py-2.5 text-sm text-[#4B2C20] transition hover:bg-white disabled:opacity-50"
      >
        <MapPin size={16} />
        {detectingLocation ? "Finding your location..." : "Use my location"}
      </button>

      {geoError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {geoError}
        </p>
      )}

      <p className="text-center text-xs text-chocolate/50">
        Search your area, drag the pin, or tap the map to fine-tune
      </p>
    </div>
  );
}
