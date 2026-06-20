type OtpEntry = {
  code: string;
  expiresAt: number;
};

const store = new Map<string, OtpEntry>();

const OTP_TTL_MS = 10 * 60 * 1000;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function createOtp(phone: string): string {
  const key = normalizePhone(phone);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS });
  return code;
}

export function verifyOtp(phone: string, code: string): boolean {
  const key = normalizePhone(phone);
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  const ok = entry.code === code.trim();
  if (ok) store.delete(key);
  return ok;
}
