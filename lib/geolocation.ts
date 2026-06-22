export function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Location permission denied. Allow location access in your browser, or set your pin on the map.";
    case 2:
      return "Location unavailable. Check device location services, or set your pin on the map.";
    case 3:
      return "Location request timed out. Try again or set your pin on the map.";
    default:
      return "Could not detect location. Try again or set your pin on the map.";
  }
}

export const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12_000,
  maximumAge: 60_000,
};

export function requestCurrentPosition(
  options?: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { ...DEFAULT_GEOLOCATION_OPTIONS, ...options }
    );
  });
}
