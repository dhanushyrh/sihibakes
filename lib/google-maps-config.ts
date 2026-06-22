/** Shared loader config — all map components must use identical options. */
export const GOOGLE_MAPS_LIBRARIES = ["places", "marker"] as const;

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

/** Server-side key for Geocoding REST calls (falls back to the public key). */
export function getGoogleMapsServerApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

/** Required for AdvancedMarkerElement. Use DEMO_MAP_ID for dev or set a Cloud Console map ID. */
export function getGoogleMapId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";
}

export function getGoogleMapsLoaderOptions() {
  return {
    googleMapsApiKey: getGoogleMapsApiKey(),
    libraries: [...GOOGLE_MAPS_LIBRARIES],
  };
}

export function withGoogleMapId(
  options?: google.maps.MapOptions
): google.maps.MapOptions {
  return {
    mapId: getGoogleMapId(),
    ...options,
  };
}
