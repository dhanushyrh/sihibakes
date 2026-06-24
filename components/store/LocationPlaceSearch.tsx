"use client";

import { useEffect, useMemo, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { getFenceBounds } from "@/lib/delivery-fence";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_LOADER_OPTIONS,
} from "@/lib/google-maps-config";
import {
  labelFromPlace,
  locationLabelForCoords,
} from "@/lib/map-location-label";
import { PlaceAutocompleteInput } from "@/components/store/PlaceAutocompleteInput";
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
  const [searchValue, setSearchValue] = useState(value);

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  const locationRestriction = useMemo(() => {
    if (!isLoaded || typeof google === "undefined") return undefined;
    if (deliveryFence) {
      const fenceBounds = getFenceBounds(kitchenLat, kitchenLng, deliveryFence);
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
  }, [isLoaded, deliveryFence, kitchenLat, kitchenLng]);

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

  return (
    <PlaceAutocompleteInput
      placeholder={placeholder}
      value={searchValue}
      locationRestriction={locationRestriction}
      onPlaceSelect={(selection) => {
        const label = locationLabelForCoords(
          selection.lat,
          selection.lng,
          labelFromPlace(selection)
        );
        setSearchValue(label);
        onPlaceSelect(selection.lat, selection.lng, label);
      }}
    />
  );
}
