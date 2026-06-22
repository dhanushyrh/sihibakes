export type ParsedMapAddress = {
  house: string;
  street: string;
  landmark: string;
  pincode: string;
};

export type AddressComponentLike = {
  long_name: string;
  short_name: string;
  types: string[];
};

function component(
  components: AddressComponentLike[],
  ...types: string[]
): string {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match?.long_name) return match.long_name;
  }
  return "";
}

export function parseAddressComponents(
  components: AddressComponentLike[]
): ParsedMapAddress {
  const streetNumber = component(components, "street_number");
  const subpremise = component(components, "subpremise");
  const premise = component(components, "premise");
  const route = component(components, "route");
  const sublocality = component(
    components,
    "sublocality_level_1",
    "sublocality_level_2",
    "sublocality"
  );
  const locality = component(components, "locality");
  const neighborhood = component(components, "neighborhood");
  const poi = component(components, "point_of_interest", "establishment");

  const houseParts = [subpremise, streetNumber].filter(Boolean);
  const house = houseParts.length > 0 ? houseParts.join(", ") : premise;

  const streetParts = [route, sublocality, locality].filter(Boolean);
  const street = [...new Set(streetParts)].join(", ");

  const landmark =
    poi && !street.includes(poi) ? poi : neighborhood && !street.includes(neighborhood) ? neighborhood : "";

  const rawPincode = component(components, "postal_code");
  const pincode = rawPincode.replace(/\D/g, "").slice(0, 6);

  return { house, street, landmark, pincode };
}

export async function reverseGeocodeAddress(
  lat: number,
  lng: number
): Promise<ParsedMapAddress | null> {
  try {
    const res = await fetch("/api/geocode/reverse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { address?: ParsedMapAddress | null };
    return data.address ?? null;
  } catch {
    return null;
  }
}
