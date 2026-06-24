import { isValidIndianPhone } from "@/lib/checkout-validation";
import { isFirstOrder } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/storefront";

export type CustomerCheckoutProfile = {
  phone: string;
  found: boolean;
  is_first_order: boolean;
  customer_name: string;
  email: string;
  alt_phone: string;
  house: string;
  street: string;
  landmark: string;
  pincode: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
};

const EMPTY_PROFILE = (
  phone: string,
  is_first_order: boolean
): CustomerCheckoutProfile => ({
  phone,
  found: false,
  is_first_order,
  customer_name: "",
  email: "",
  alt_phone: "",
  house: "",
  street: "",
  landmark: "",
  pincode: "",
  delivery_lat: null,
  delivery_lng: null,
});

export async function lookupCustomerCheckoutProfile(
  phone: string
): Promise<CustomerCheckoutProfile | { error: string }> {
  const normalized = normalizePhone(phone);
  if (!isValidIndianPhone(normalized)) {
    return { error: "Enter a valid 10-digit phone number" };
  }

  const admin = createAdminClient();
  const firstOrder = await isFirstOrder(normalized);

  const [{ data: customer }, { data: lastOrder }] = await Promise.all([
    admin
      .from("customers")
      .select("name, email")
      .eq("phone", normalized)
      .maybeSingle(),
    admin
      .from("orders")
      .select(
        "customer_name, alt_phone, house, street, landmark, pincode, delivery_lat, delivery_lng"
      )
      .eq("phone", normalized)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!customer && !lastOrder) {
    return EMPTY_PROFILE(normalized, firstOrder);
  }

  return {
    phone: normalized,
    found: true,
    is_first_order: firstOrder,
    customer_name: customer?.name?.trim() || lastOrder?.customer_name?.trim() || "",
    email: customer?.email?.trim() || "",
    alt_phone: lastOrder?.alt_phone?.trim() || "",
    house: lastOrder?.house?.trim() || "",
    street: lastOrder?.street?.trim() || "",
    landmark: lastOrder?.landmark?.trim() || "",
    pincode: lastOrder?.pincode?.trim() || "",
    delivery_lat: lastOrder?.delivery_lat ?? null,
    delivery_lng: lastOrder?.delivery_lng ?? null,
  };
}
