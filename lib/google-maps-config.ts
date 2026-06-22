/** Shared loader config — all map components must use identical options. */
export const GOOGLE_MAPS_LIBRARIES: ("places" | "marker")[] = [
  "places",
  "marker",
];

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

/** Stable reference for useJsApiLoader — do not build a new object per render. */
export const GOOGLE_MAPS_LOADER_OPTIONS = {
  googleMapsApiKey: getGoogleMapsApiKey(),
  libraries: GOOGLE_MAPS_LIBRARIES,
};

/** @deprecated Use GOOGLE_MAPS_LOADER_OPTIONS for useJsApiLoader. */
export function getGoogleMapsLoaderOptions() {
  return GOOGLE_MAPS_LOADER_OPTIONS;
}

/** Required for AdvancedMarkerElement. Use DEMO_MAP_ID for dev or set a Cloud Console map ID. */
export function getGoogleMapId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";
}

export function withGoogleMapId(
  options?: google.maps.MapOptions
): google.maps.MapOptions {
  return {
    mapId: getGoogleMapId(),
    ...options,
  };
}
