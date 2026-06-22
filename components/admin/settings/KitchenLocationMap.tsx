"use client";

import {
  GoogleMap,
  Rectangle,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, ExternalLink, MapPin } from "lucide-react";
import { AdvancedMapMarker } from "@/components/store/AdvancedMapMarker";
import { getFenceBounds } from "@/lib/delivery-fence";
import { getGoogleMapsApiKey, GOOGLE_MAPS_LOADER_OPTIONS, withGoogleMapId } from "@/lib/google-maps-config";
import { geolocationErrorMessage } from "@/lib/geolocation";
import { googleMapsUrl } from "@/lib/storefront";
import type { DeliveryFenceKm } from "@/lib/types";

const mapContainerStyle = {
  width: "100%",
  height: "240px",
  borderRadius: "0.75rem",
};

function hasValidKitchenCoords(kitchenLat: number, kitchenLng: number) {
  return (
    Number.isFinite(kitchenLat) &&
    Number.isFinite(kitchenLng) &&
    !(kitchenLat === 0 && kitchenLng === 0)
  );
}

type KitchenLocationMapProps = {
  lat: number;
  lng: number;
  deliveryFence?: DeliveryFenceKm;
  readOnly?: boolean;
  onChange?: (lat: number, lng: number) => void;
};

export function KitchenLocationMap({
  lat,
  lng,
  deliveryFence,
  readOnly = false,
  onChange,
}: KitchenLocationMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const initialFitDone = useRef(false);
  const lastPanRef = useRef<{ lat: number; lng: number } | null>(null);

  const fenceBounds = useMemo(() => {
    if (!deliveryFence || !hasValidKitchenCoords(lat, lng)) return null;
    return getFenceBounds(lat, lng, deliveryFence);
  }, [deliveryFence, lat, lng]);

  const hasValidCoords = hasValidKitchenCoords(lat, lng);

  const center = hasValidCoords
    ? { lat, lng }
    : { lat: 12.9716, lng: 77.5946 };

  const panMapTo = useCallback(
    (newLat: number, newLng: number, zoom = 15) => {
      lastPanRef.current = { lat: newLat, lng: newLng };
      if (map) {
        map.panTo({ lat: newLat, lng: newLng });
        if (zoom > 0) map.setZoom(zoom);
      }
    },
    [map]
  );

  const onLoad = useCallback(
    (m: google.maps.Map) => {
      setMap(m);

      if (hasValidKitchenCoords(lat, lng)) {
        m.panTo({ lat, lng });
        m.setZoom(15);
        initialFitDone.current = true;
        return;
      }

      if (fenceBounds && !initialFitDone.current) {
        m.fitBounds(
          new google.maps.LatLngBounds(
            { lat: fenceBounds.south, lng: fenceBounds.west },
            { lat: fenceBounds.north, lng: fenceBounds.east }
          ),
          40
        );
        initialFitDone.current = true;
      }
    },
    [fenceBounds, lat, lng]
  );

  useEffect(() => {
    if (!map || !hasValidKitchenCoords(lat, lng)) return;

    const last = lastPanRef.current;
    if (last && last.lat === lat && last.lng === lng) return;

    panMapTo(lat, lng, 0);
  }, [map, lat, lng, panMapTo]);

  const detectStoreLocation = useCallback(() => {
    if (!onChange) return;

    if (!navigator.geolocation) {
      setDetectError("Geolocation is not supported on this device.");
      return;
    }

    setDetectError(null);
    setDetecting(true);

    const finish = (newLat: number, newLng: number) => {
      onChange(newLat, newLng);
      panMapTo(newLat, newLng, 15);
      setDetecting(false);
    };

    const fail = (err: GeolocationPositionError, allowRetry: boolean) => {
      if (allowRetry && err.code === err.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          (pos) => finish(pos.coords.latitude, pos.coords.longitude),
          (retryErr) => {
            setDetecting(false);
            setDetectError(geolocationErrorMessage(retryErr.code));
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 }
        );
        return;
      }
      setDetecting(false);
      setDetectError(geolocationErrorMessage(err.code));
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => finish(pos.coords.latitude, pos.coords.longitude),
      (err) => fail(err, true),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [onChange, panMapTo]);

  const detectControls =
    !readOnly && onChange ? (
      <>
        <button
          type="button"
          onClick={detectStoreLocation}
          disabled={detecting}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#4B2C20]/20 py-2.5 text-sm font-medium text-[#4B2C20] transition hover:bg-[#F5E6D3]/60 disabled:opacity-50"
        >
          <Crosshair size={16} />
          {detecting ? "Detecting location..." : "Detect store location"}
        </button>
        <p className="text-center text-xs text-[#4B2C20]/50">
          Tap the map, drag the pin, or detect your current location
        </p>
        {detectError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
            {detectError}
          </p>
        )}
      </>
    ) : null;

  if (!apiKey) {
    return (
      <div className="space-y-3">
        <div className="flex h-[240px] flex-col items-center justify-center rounded-xl bg-[#F5E6D3] p-4 text-center text-sm text-[#4B2C20]/70">
          <MapPin className="mb-2" size={20} />
          <p>Google Maps API key not configured.</p>
          <p className="mt-1 text-xs">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local</p>
        </div>
        {detectControls}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          Could not load Google Maps. Check your API key and billing settings.
        </div>
        {detectControls}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {detectControls}

      {!isLoaded ? (
        <div className="flex h-[240px] items-center justify-center rounded-xl bg-[#F5E6D3]">
          <p className="text-sm text-[#4B2C20]/50">Loading map...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-[#4B2C20]/10">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={hasValidCoords ? 15 : 12}
            onLoad={onLoad}
            onClick={
              readOnly || !onChange
                ? undefined
                : (e) => {
                    if (e.latLng) {
                      const newLat = e.latLng.lat();
                      const newLng = e.latLng.lng();
                      onChange(newLat, newLng);
                      panMapTo(newLat, newLng, 0);
                    }
                  }
            }
            options={withGoogleMapId({
              disableDefaultUI: true,
              zoomControl: true,
              gestureHandling: readOnly ? "none" : "greedy",
              draggable: !readOnly,
              scrollwheel: !readOnly,
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
            {hasValidCoords && (
              <AdvancedMapMarker
                lat={lat}
                lng={lng}
                title="Kitchen / store"
                draggable={!readOnly && !!onChange}
                onDragEnd={
                  readOnly || !onChange
                    ? undefined
                    : (newLat, newLng) => {
                        onChange(newLat, newLng);
                        panMapTo(newLat, newLng, 0);
                      }
                }
              />
            )}
          </GoogleMap>
        </div>
      )}

      {readOnly && hasValidCoords && (
        <a
          href={googleMapsUrl(lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4B2C20]/70 underline-offset-2 hover:text-[#4B2C20] hover:underline"
        >
          <ExternalLink size={12} />
          Open in Google Maps
        </a>
      )}
    </div>
  );
}
