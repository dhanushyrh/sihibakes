"use client";

import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getFenceBounds } from "@/lib/delivery-fence";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_LOADER_OPTIONS,
} from "@/lib/google-maps-config";
import {
  labelFromPlace,
  locationLabelForCoords,
} from "@/lib/map-location-label";
import type { DeliveryFenceKm } from "@/lib/types";

type LocationPlaceSearchProps = {
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence?: DeliveryFenceKm;
  value?: string;
  placeholder?: string;
  onPlaceSelect: (lat: number, lng: number, label: string) => void;
};

export function LocationPlaceSearch({
  kitchenLat,
  kitchenLng,
  deliveryFence,
  value = "",
  placeholder = "Search area, street, or landmark",
  onPlaceSelect,
}: LocationPlaceSearchProps) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [searchValue, setSearchValue] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setSearchValue(value);
  }, [value, editing]);

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

  const onPlaceChanged = useCallback(() => {
    const place = autocomplete?.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return;

    const lat = loc.lat();
    const lng = loc.lng();
    const label = locationLabelForCoords(lat, lng, labelFromPlace(place));
    setEditing(false);
    setSearchValue(label);
    onPlaceSelect(lat, lng, label);
  }, [autocomplete, onPlaceSelect]);

  if (!apiKey) {
    return (
      <input
        type="search"
        disabled
        placeholder="Maps search unavailable"
        className="w-full rounded-2xl border border-chocolate/15 bg-white py-3 px-4 text-base text-chocolate/40"
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-chocolate/40"
        />
        <input
          type="search"
          disabled
          placeholder="Loading search..."
          className="w-full rounded-2xl border border-chocolate/15 bg-white py-3 pl-10 pr-4 text-base text-chocolate/40"
        />
      </div>
    );
  }

  return (
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
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-chocolate/40"
        />
        <input
          type="search"
          enterKeyHint="search"
          value={searchValue}
          onChange={(e) => {
            setEditing(true);
            setSearchValue(e.target.value);
          }}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-chocolate/15 bg-white py-3 pl-10 pr-4 text-base text-chocolate placeholder:text-chocolate/40 ring-1 ring-chocolate/5 focus:border-chocolate/30 focus:outline-none focus:ring-2 focus:ring-chocolate/10"
        />
      </div>
    </Autocomplete>
  );
}
