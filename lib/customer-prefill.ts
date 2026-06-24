import type { CustomerCheckoutProfile } from "@/lib/customer-lookup";
import { isCheckoutLocationReachable } from "@/lib/checkout-routing";
import type { DeliveryCalculation } from "@/lib/types";

export type CustomerPrefillResult = {
  profile: CustomerCheckoutProfile;
  locationReachable: boolean;
  prefillNote: string;
};

type PrefillSetters = {
  sessionLat: number | null;
  sessionLng: number | null;
  setCustomer: (fields: {
    customerName?: string;
    email?: string;
    altPhone?: string;
  }) => void;
  setAddress: (fields: {
    house?: string;
    street?: string;
    landmark?: string;
    pincode?: string;
  }) => void;
  setLocation: (
    lat: number,
    lng: number,
    delivery: DeliveryCalculation | null
  ) => void;
};

export async function fetchCustomerProfile(
  phone: string,
  signal?: AbortSignal
): Promise<CustomerCheckoutProfile | null> {
  const res = await fetch("/api/customers/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
    signal,
  });
  if (!res.ok) return null;
  return (await res.json()) as CustomerCheckoutProfile;
}

export async function prefillCustomerFromLookup(
  phone: string,
  setters: PrefillSetters,
  signal?: AbortSignal
): Promise<CustomerPrefillResult> {
  const data = await fetchCustomerProfile(phone, signal);
  const profile: CustomerCheckoutProfile = data ?? {
    phone,
    found: false,
    is_first_order: true,
    customer_name: "",
    email: "",
    alt_phone: "",
    house: "",
    street: "",
    landmark: "",
    pincode: "",
    delivery_lat: null,
    delivery_lng: null,
  };

  let locationReachable = isCheckoutLocationReachable(
    setters.sessionLat,
    setters.sessionLng,
    null
  );

  if (profile.found) {
    setters.setCustomer({
      customerName: profile.customer_name,
      email: profile.email,
      altPhone: profile.alt_phone,
    });
    setters.setAddress({
      house: profile.house,
      street: profile.street,
      landmark: profile.landmark,
      pincode: profile.pincode,
    });

    if (
      setters.sessionLat == null &&
      setters.sessionLng == null &&
      profile.delivery_lat != null &&
      profile.delivery_lng != null
    ) {
      const calcRes = await fetch("/api/delivery/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: profile.delivery_lat,
          lng: profile.delivery_lng,
        }),
        signal,
      });
      if (calcRes.ok) {
        const delivery = (await calcRes.json()) as DeliveryCalculation;
        setters.setLocation(profile.delivery_lat, profile.delivery_lng, delivery);
        locationReachable = isCheckoutLocationReachable(
          profile.delivery_lat,
          profile.delivery_lng,
          delivery
        );
      }
    }
  }

  return {
    profile,
    locationReachable,
    prefillNote: profile.found
      ? "Welcome back — we filled in your saved details."
      : "",
  };
}
