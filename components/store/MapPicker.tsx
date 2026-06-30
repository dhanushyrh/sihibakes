"use client";

import {
  GoogleMap,
  Rectangle,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { AdvancedMapMarker } from "@/components/store/AdvancedMapMarker";
import { PlaceAutocompleteInput } from "@/components/store/PlaceAutocompleteInput";
import { getFenceBounds } from "@/lib/delivery-fence";
import {
  geolocationErrorMessage,
  requestCurrentPosition,
} from "@/lib/geolocation";
import { getGoogleMapsApiKey, GOOGLE_MAPS_LOADER_OPTIONS, withGoogleMapId } from "@/lib/google-maps-config";
import {
  formatCoordinates,
  labelFromPlace,
  locationLabelForCoords,
} from "@/lib/map-location-label";
import type { DeliveryFenceKm } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";

const PIN_ZOOM = 16;

interface MapPickerProps {
  kitchenLat: number;
  kitchenLng: number;
  lat: number;
  lng: number;
  deliveryFence?: DeliveryFenceKm;
  /** When "marker", center and zoom on the pin. Use "fence" for a first-time area overview. */
  initialView?: "marker" | "fence";
  searchLabel?: string;
  showSearch?: boolean;
  showUseLocationButton?: boolean;
  showHint?: boolean;
  mapHeight?: number;
  onChange: (lat: number, lng: number) => void;
  onSearchLabelChange?: (label: string) => void;
}

export function MapPicker({
  kitchenLat,
  kitchenLng,
  lat,
  lng,
  deliveryFence,
  initialView = "marker",
  searchLabel,
  showSearch = true,
  showUseLocationButton = true,
  showHint = true,
  mapHeight = 320,
  onChange,
  onSearchLabelChange,
}: MapPickerProps) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchValue, setSearchValue] = useState(
    searchLabel ?? formatCoordinates(lat, lng)
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const mapContainerStyle = {
    width: "100%",
    height: `${mapHeight}px`,
    borderRadius: "1rem",
  };

  const fenceBounds = useMemo(() => {
    if (!deliveryFence) return null;
    return getFenceBounds(kitchenLat, kitchenLng, deliveryFence);
  }, [deliveryFence, kitchenLat, kitchenLng]);

  const locationRestriction = useMemo(() => {
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
      if (map && map.getZoom()! < PIN_ZOOM) {
        map.setZoom(PIN_ZOOM);
      }
    },
    [map, onChange, applyLabel]
  );

  const focusOnMarker = useCallback(
    (m: google.maps.Map, targetLat: number, targetLng: number) => {
      m.setCenter({ lat: targetLat, lng: targetLng });
      m.setZoom(PIN_ZOOM);
    },
    []
  );

  const onLoad = useCallback(
    (m: google.maps.Map) => {
      setMap(m);
      if (initialView === "fence" && fenceBounds) {
        m.fitBounds(
          new google.maps.LatLngBounds(
            { lat: fenceBounds.south, lng: fenceBounds.west },
            { lat: fenceBounds.north, lng: fenceBounds.east }
          ),
          40
        );
        return;
      }
      focusOnMarker(m, lat, lng);
    },
    [fenceBounds, focusOnMarker, initialView, lat, lng]
  );

  useEffect(() => {
    if (!map || initialView === "fence") return;
    focusOnMarker(map, lat, lng);
  }, [focusOnMarker, initialView, lat, lng, map]);

  useEffect(() => {
    if (searchLabel === undefined) return;
    setSearchValue(searchLabel);
  }, [searchLabel]);

  const useMyLocation = async () => {
    setGeoError(null);
    setDetectingLocation(true);
    try {
      const pos = await requestCurrentPosition();
      const { latitude, longitude } = pos.coords;
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
      <div
        className="flex flex-col items-center justify-center rounded-2xl bg-[#F5E6D3] p-4 text-center text-sm text-[#4B2C20]/70"
        style={{ height: mapHeight }}
      >
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
      <div
        className="flex items-center justify-center rounded-2xl bg-[#F5E6D3]"
        style={{ height: mapHeight }}
      >
        <Spinner size="md" label="Loading map" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSearch && (
        <PlaceAutocompleteInput
          value={searchValue}
          locationRestriction={locationRestriction}
          iconClassName="text-[#4B2C20]/40"
          onPlaceSelect={(selection) => {
            const label = locationLabelForCoords(
              selection.lat,
              selection.lng,
              labelFromPlace(selection)
            );
            movePin(selection.lat, selection.lng, label);
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl ring-1 ring-[#4B2C20]/10">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          onLoad={onLoad}
          onClick={(e) => {
            if (!e.latLng) return;
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
              movePin(newLat, newLng, formatCoordinates(newLat, newLng));
            }}
          />
        </GoogleMap>
      </div>

      {showUseLocationButton && (
        <button
          type="button"
          onClick={() => void useMyLocation()}
          disabled={detectingLocation}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#4B2C20]/20 py-2.5 text-sm text-[#4B2C20] transition hover:bg-white disabled:opacity-50"
        >
          <MapPin size={16} />
          {detectingLocation ? "Finding your location..." : "Use my location"}
        </button>
      )}

      {geoError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {geoError}
        </p>
      )}

      {showHint && (
        <p className="text-center text-xs text-chocolate/50">
          Search your area, drag the pin, or tap the map to fine-tune
        </p>
      )}
    </div>
  );
}
