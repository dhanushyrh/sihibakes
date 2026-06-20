export function normalizeIndianPhone(input: string): string {
  return input.replace(/\D/g, "").replace(/^91/, "").slice(-10);
}

export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianPhone(phone));
}

export function isValidIndianPincode(pincode: string): boolean {
  return /^[1-9]\d{5}$/.test(pincode.trim());
}

export function formatIndianPhoneInput(input: string): string {
  return normalizeIndianPhone(input).slice(0, 10);
}

export function formatPincodeInput(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}
