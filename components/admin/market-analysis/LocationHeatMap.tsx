"use client";

import { useCallback, useMemo, useState } from "react";
import { Circle, GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import type { HeatMapPoint } from "@/lib/market-analysis";
import { formatCurrency } from "@/lib/delivery";
import {
  getGoogleMapsApiKey,
  GOOGLE_MAPS_LOADER_OPTIONS,
  withGoogleMapId,
} from "@/lib/google-maps-config";

type MapFilter = "all" | "completed" | "abandoned" | "low_conversion";

interface LocationHeatMapProps {
  points: HeatMapPoint[];
  kitchenLat: number;
  kitchenLng: number;
}

const MAP_HEIGHT = 420;

function filterPoints(points: HeatMapPoint[], filter: MapFilter): HeatMapPoint[] {
  switch (filter) {
    case "completed":
      return points.filter((p) => p.completedSessions > 0);
    case "abandoned":
      return points.filter((p) => p.abandonedSessions > 0);
    case "low_conversion":
      return points.filter(
        (p) => p.totalSessions >= 2 && p.conversionRate < 40
      );
    default:
      return points;
  }
}

function circleColor(point: HeatMapPoint): string {
  if (point.conversionRate >= 50) return "#4B2C20";
  if (point.conversionRate >= 25) return "#B45309";
  return "#DC2626";
}

export function LocationHeatMap({
  points,
  kitchenLat,
  kitchenLng,
}: LocationHeatMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);
  const [filter, setFilter] = useState<MapFilter>("all");
  const [selected, setSelected] = useState<HeatMapPoint | null>(null);

  const filtered = useMemo(
    () => filterPoints(points, filter),
    [points, filter]
  );

  const center = useMemo(
    () => ({ lat: kitchenLat, lng: kitchenLng }),
    [kitchenLat, kitchenLng]
  );

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      if (filtered.length === 0) {
        map.setCenter(center);
        map.setZoom(12);
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(center);
      filtered.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }));
      map.fitBounds(bounds, 48);
    },
    [center, filtered]
  );

  const filters: { id: MapFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "completed", label: "Completed" },
    { id: "abandoned", label: "Abandoned" },
    { id: "low_conversion", label: "Low conversion" },
  ];

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#4B2C20]">Location heat map</h3>
          <p className="mt-0.5 text-xs text-[#4B2C20]/50">
            Real map view of delivery demand clusters around your kitchen
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setFilter(id);
                setSelected(null);
              }}
              className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${
                filter === id
                  ? "bg-[#4B2C20] text-white"
                  : "bg-[#F5E6D3] text-[#4B2C20]/70 hover:text-[#4B2C20]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!apiKey ? (
        <p className="mt-8 text-center text-sm text-[#4B2C20]/45">
          Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the admin map.
        </p>
      ) : loadError ? (
        <p className="mt-8 text-center text-sm text-red-600">
          Could not load Google Maps.
        </p>
      ) : points.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[#4B2C20]/45">
          No location data yet. Coordinates appear when customers mark delivery
          locations.
        </p>
      ) : !isLoaded ? (
        <div
          className="mt-4 flex items-center justify-center rounded-xl bg-[#FAF6F0]"
          style={{ height: MAP_HEIGHT }}
        >
          <p className="text-sm text-[#4B2C20]/50">Loading map...</p>
        </div>
      ) : (
        <>
          <div
            className="mt-4 overflow-hidden rounded-xl ring-1 ring-[#4B2C20]/10"
            style={{ height: MAP_HEIGHT }}
          >
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: MAP_HEIGHT }}
              center={center}
              zoom={12}
              onLoad={onMapLoad}
              onClick={() => setSelected(null)}
              options={withGoogleMapId({
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              })}
            >
              <Circle
                center={center}
                radius={120}
                options={{
                  fillColor: "#F5E6D3",
                  fillOpacity: 0.9,
                  strokeColor: "#4B2C20",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  clickable: false,
                }}
              />
              {filtered.map((point) => {
                const radius = 350 + point.totalSessions * 180;
                const color = circleColor(point);
                const isSelected =
                  selected?.lat === point.lat && selected?.lng === point.lng;

                return (
                  <Circle
                    key={`${point.lat}-${point.lng}`}
                    center={{ lat: point.lat, lng: point.lng }}
                    radius={radius}
                    options={{
                      fillColor: color,
                      fillOpacity: isSelected ? 0.45 : 0.28,
                      strokeColor: color,
                      strokeOpacity: isSelected ? 0.9 : 0.55,
                      strokeWeight: isSelected ? 3 : 2,
                      clickable: true,
                    }}
                    onClick={() => setSelected(point)}
                  />
                );
              })}
            </GoogleMap>
          </div>

          {selected && (
            <div className="mt-3 rounded-xl bg-[#FAF6F0] px-4 py-3 text-sm">
              <p className="font-medium text-[#4B2C20]">
                Cluster · {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#4B2C20]/70">
                <div>
                  <dt>Sessions</dt>
                  <dd className="font-semibold text-[#4B2C20]">
                    {selected.totalSessions}
                  </dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd className="font-semibold text-[#4B2C20]">
                    {selected.completedSessions}
                  </dd>
                </div>
                <div>
                  <dt>Abandoned</dt>
                  <dd className="font-semibold text-[#4B2C20]">
                    {selected.abandonedSessions}
                  </dd>
                </div>
                <div>
                  <dt>Conversion</dt>
                  <dd className="font-semibold text-[#4B2C20]">
                    {selected.conversionRate}%
                  </dd>
                </div>
              </dl>
              {selected.topItems?.length ? (
                <p className="mt-2 text-xs text-[#4B2C20]/60">
                  Top items: {selected.topItems.join(", ")}
                </p>
              ) : null}
              {selected.lostRevenueInr > 0 && (
                <p className="mt-2 text-xs text-[#4B2C20]/60">
                  Lost revenue estimate: {formatCurrency(selected.lostRevenueInr)}
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-[#4B2C20]/55">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F5E6D3] ring-2 ring-[#4B2C20]" />
              Kitchen
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4B2C20]" />
              Healthy conversion
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B45309]" />
              Mixed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#DC2626]" />
              Low conversion
            </span>
          </div>
        </>
      )}
    </div>
  );
}
