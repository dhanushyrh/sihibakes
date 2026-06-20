/** Shared loader config — all map components must use identical options. */
export const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

export function getGoogleMapsLoaderOptions() {
  return {
    googleMapsApiKey: getGoogleMapsApiKey(),
    libraries: GOOGLE_MAPS_LIBRARIES,
  };
}
