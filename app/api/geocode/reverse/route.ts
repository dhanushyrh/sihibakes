import { NextResponse } from "next/server";
import { getGoogleMapsServerApiKey } from "@/lib/google-maps-config";
import {
  parseAddressComponents,
  type AddressComponentLike,
} from "@/lib/map-address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeocodeResponse = {
  status: string;
  error_message?: string;
  results?: Array<{ address_components?: AddressComponentLike[] }>;
};

export async function POST(request: Request) {
  try {
    const { lat, lng } = await request.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const apiKey = getGoogleMapsServerApiKey();
    if (!apiKey) {
      return NextResponse.json({ address: null });
    }

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("region", "in");

    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = (await res.json()) as GeocodeResponse;

    if (data.status !== "OK") {
      if (data.status === "REQUEST_DENIED") {
        console.warn(
          "Geocoding API denied:",
          data.error_message ??
            "Enable Geocoding API for your Google Maps key in Google Cloud Console."
        );
      }
      return NextResponse.json({ address: null });
    }

    const components = data.results?.[0]?.address_components;
    if (!components?.length) {
      return NextResponse.json({ address: null });
    }

    return NextResponse.json({ address: parseAddressComponents(components) });
  } catch {
    return NextResponse.json({ address: null });
  }
}
