import { createAdminClient } from "@/lib/supabase/admin";

const OTP_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export class OtpResendCooldownError extends Error {
  constructor() {
    super("RESEND_COOLDOWN");
    this.name = "OtpResendCooldownError";
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function markPhoneVerified(phone: string) {
  const key = normalizePhone(phone);
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + VERIFIED_TTL_MS).toISOString();

  await admin.from("phone_verifications").upsert({
    phone: key,
    expires_at: expiresAt,
  });
}

export async function isPhoneVerified(phone: string): Promise<boolean> {
  const key = normalizePhone(phone);
  const admin = createAdminClient();

  const { data } = await admin
    .from("phone_verifications")
    .select("expires_at")
    .eq("phone", key)
    .maybeSingle();

  if (!data) return false;

  if (new Date(data.expires_at) < new Date()) {
    await admin.from("phone_verifications").delete().eq("phone", key);
    return false;
  }

  return true;
}

export async function clearPhoneVerified(phone: string) {
  const key = normalizePhone(phone);
  const admin = createAdminClient();
  await admin.from("phone_verifications").delete().eq("phone", key);
}

export async function createOtp(phone: string): Promise<string> {
  const key = normalizePhone(phone);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("phone_otps")
    .select("created_at")
    .eq("phone", key)
    .maybeSingle();

  if (existing?.created_at) {
    const elapsed = Date.now() - new Date(existing.created_at).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      throw new OtpResendCooldownError();
    }
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { error } = await admin.from("phone_otps").upsert({
    phone: key,
    code,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;

  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const key = normalizePhone(phone);
  const admin = createAdminClient();

  const { data: entry } = await admin
    .from("phone_otps")
    .select("code, expires_at")
    .eq("phone", key)
    .maybeSingle();

  if (!entry) return false;

  if (new Date(entry.expires_at) < new Date()) {
    await admin.from("phone_otps").delete().eq("phone", key);
    return false;
  }

  const ok = entry.code === code.trim();
  if (ok) {
    await admin.from("phone_otps").delete().eq("phone", key);
    await markPhoneVerified(key);
  }

  return ok;
}
