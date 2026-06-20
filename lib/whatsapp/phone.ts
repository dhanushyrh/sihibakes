/** Normalize to 10-digit Indian mobile number. */
export function normalizeIndianPhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** Format for WhatsApp Cloud API (country code 91, no +). */
export function formatPhoneForWhatsApp(phone: string): string | null {
  const digits = normalizeIndianPhone(phone);
  if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) return null;
  return `91${digits}`;
}
