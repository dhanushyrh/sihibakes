/** Short coordinate string for map search / display (≈1 m precision). */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function labelFromPlace(place: {
  formatted_address?: string | null;
  name?: string | null;
}): string | null {
  const text = place.formatted_address?.trim() || place.name?.trim();
  return text || null;
}

export function locationLabelForCoords(
  lat: number,
  lng: number,
  placeName?: string | null
): string {
  return placeName?.trim() || formatCoordinates(lat, lng);
}
