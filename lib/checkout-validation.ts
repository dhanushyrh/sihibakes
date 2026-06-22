export function normalizeIndianPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  // Only strip country/trunk prefix when the number is longer than 10 digits
  // (avoids wiping "91" while the user types a number starting with 9 then 1)
  if (digits.length > 10) {
    if (digits.startsWith("91")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = digits.slice(1);
  }
  return digits.slice(-10);
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
