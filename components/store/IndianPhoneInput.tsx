"use client";

import { formatIndianPhoneInput } from "@/lib/checkout-validation";

type IndianPhoneInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  invalid?: boolean;
};

export function IndianPhoneInput({
  id,
  value,
  onChange,
  placeholder = "9876543210",
  autoComplete = "tel-national",
  invalid = false,
}: IndianPhoneInputProps) {
  return (
    <div
      className={`mt-1 flex overflow-hidden rounded-xl border bg-white focus-within:border-chocolate/30 ${
        invalid ? "border-red-300" : "border-chocolate/10"
      }`}
    >
      <span className="flex items-center bg-cream px-3 text-sm font-medium text-chocolate/70">
        +91
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        maxLength={10}
        value={value}
        onChange={(e) => onChange(formatIndianPhoneInput(e.target.value))}
        placeholder={placeholder}
        aria-invalid={invalid}
        className="min-w-0 flex-1 px-3 py-3 text-base outline-none"
      />
    </div>
  );
}
