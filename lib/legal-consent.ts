import { normalizeIndianPhone } from "@/lib/checkout-validation";
import { LEGAL_LAST_UPDATED } from "@/lib/legal-pages";
import { isPhoneVerified } from "@/lib/otp-store";
import { createAdminClient } from "@/lib/supabase/admin";

export const LEGAL_CONSENT_SOURCES = [
  "checkout",
  "landing_contact",
  "general_enquiry",
  "kitty_party_enquiry",
] as const;

export type LegalConsentSource = (typeof LEGAL_CONSENT_SOURCES)[number];

export const CURRENT_TERMS_VERSION = LEGAL_LAST_UPDATED;
export const CURRENT_PRIVACY_VERSION = LEGAL_LAST_UPDATED;

export function isLegalConsentSource(value: unknown): value is LegalConsentSource {
  return (
    typeof value === "string" &&
    (LEGAL_CONSENT_SOURCES as readonly string[]).includes(value)
  );
}

function normalizePhone(phone: string): string {
  return normalizeIndianPhone(phone);
}

function getRequestMetadata(request: Request): {
  ip_address: string | null;
  user_agent: string | null;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip_address = forwarded?.split(",")[0]?.trim() || null;
  const user_agent = request.headers.get("user-agent");
  return {
    ip_address,
    user_agent: user_agent || null,
  };
}

export async function hasCurrentPhoneLegalAcknowledgement(
  phone: string
): Promise<boolean> {
  const key = normalizePhone(phone);
  const admin = createAdminClient();

  const { data } = await admin
    .from("phone_legal_acknowledgements")
    .select("id")
    .eq("phone", key)
    .eq("terms_version", CURRENT_TERMS_VERSION)
    .eq("privacy_version", CURRENT_PRIVACY_VERSION)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function recordPhoneLegalAcknowledgement(
  phone: string,
  source: LegalConsentSource,
  request: Request
): Promise<void> {
  const key = normalizePhone(phone);
  const admin = createAdminClient();
  const { ip_address, user_agent } = getRequestMetadata(request);

  const { error } = await admin.from("phone_legal_acknowledgements").insert({
    phone: key,
    terms_version: CURRENT_TERMS_VERSION,
    privacy_version: CURRENT_PRIVACY_VERSION,
    legal_last_updated: LEGAL_LAST_UPDATED,
    source,
    ip_address,
    user_agent,
  });

  if (error) throw error;
}

export async function requireVerifiedPhoneWithConsent(phone: string): Promise<{
  ok: true;
} | {
  ok: false;
  error: string;
  status: number;
}> {
  const key = normalizePhone(phone);

  if (!(await isPhoneVerified(key))) {
    return {
      ok: false,
      error: "Please verify your phone number with OTP before continuing",
      status: 403,
    };
  }

  if (!(await hasCurrentPhoneLegalAcknowledgement(key))) {
    return {
      ok: false,
      error: "Please accept the Terms & Conditions and Privacy Policy to continue",
      status: 403,
    };
  }

  return { ok: true };
}
