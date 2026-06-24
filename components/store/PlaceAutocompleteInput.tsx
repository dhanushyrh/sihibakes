"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_LOADER_OPTIONS,
} from "@/lib/google-maps-config";

export type PlaceAutocompleteSelection = {
  lat: number;
  lng: number;
  displayName: string | null;
  formattedAddress: string | null;
};

type PlaceAutocompleteInputProps = {
  placeholder?: string;
  value?: string;
  locationRestriction?: google.maps.LatLngBounds;
  onPlaceSelect: (selection: PlaceAutocompleteSelection) => void;
  /** Tailwind classes for the outer wrapper (icon + field). */
  className?: string;
  iconClassName?: string;
};

type PlaceSelectEvent = Event & {
  placePrediction: {
    toPlace: () => google.maps.places.Place;
  };
};

function readLatLng(
  location: google.maps.LatLng | google.maps.LatLngLiteral
): { lat: number; lng: number } {
  if (typeof (location as google.maps.LatLng).lat === "function") {
    const ll = location as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  const literal = location as google.maps.LatLngLiteral;
  return { lat: literal.lat, lng: literal.lng };
}

function setAutocompleteValue(
  el: google.maps.places.PlaceAutocompleteElement,
  text: string
) {
  if ("value" in el) {
    (el as google.maps.places.PlaceAutocompleteElement & { value: string }).value =
      text;
    return;
  }
  const input = el.shadowRoot?.querySelector("input");
  if (input instanceof HTMLInputElement) {
    input.value = text;
  }
}

export function PlaceAutocompleteInput({
  placeholder = "Search area, street, or landmark",
  value,
  locationRestriction,
  onPlaceSelect,
  className = "",
  iconClassName = "text-chocolate/40",
}: PlaceAutocompleteInputProps) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(
    null
  );
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const locationRestrictionRef = useRef(locationRestriction);

  onPlaceSelectRef.current = onPlaceSelect;
  locationRestrictionRef.current = locationRestriction;

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;
    if (
      typeof google === "undefined" ||
      !google.maps?.places?.PlaceAutocompleteElement
    ) {
      return;
    }

    const el = new google.maps.places.PlaceAutocompleteElement({
      componentRestrictions: { country: "in" },
    });
    el.setAttribute("placeholder", placeholder);
    if (locationRestrictionRef.current) {
      el.locationRestriction = locationRestrictionRef.current;
    }

    const onSelect = async (event: Event) => {
      const { placePrediction } = event as PlaceSelectEvent;
      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location"],
      });
      if (!place.location) return;

      const { lat, lng } = readLatLng(place.location);
      onPlaceSelectRef.current({
        lat,
        lng,
        displayName: place.displayName ?? null,
        formattedAddress: place.formattedAddress ?? null,
      });
    };

    el.addEventListener("gmp-select", onSelect);
    containerRef.current.replaceChildren(el);
    elementRef.current = el;

    return () => {
      el.removeEventListener("gmp-select", onSelect);
      el.remove();
      elementRef.current = null;
    };
  }, [isLoaded]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    el.setAttribute("placeholder", placeholder);
  }, [placeholder]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    el.locationRestriction = locationRestriction ?? null;
  }, [locationRestriction]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || value === undefined) return;
    setAutocompleteValue(el, value);
  }, [value]);

  if (!apiKey) {
    return (
      <input
        type="search"
        disabled
        placeholder="Maps search unavailable"
        className={`w-full rounded-2xl border border-chocolate/15 bg-white py-3 px-4 text-base text-chocolate/40 ${className}`}
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className={`place-autocomplete-wrap relative ${className}`}>
        <Search
          size={16}
          className={`pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 ${iconClassName}`}
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
    <div className={`place-autocomplete-wrap relative ${className}`}>
      <Search
        size={16}
        className={`pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 ${iconClassName}`}
      />
      <div ref={containerRef} className="place-autocomplete-host" />
    </div>
  );
}
