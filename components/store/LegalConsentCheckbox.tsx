import Link from "next/link";
import type { LegalConsentSource } from "@/lib/legal-consent";

type LegalConsentCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
};

export function LegalConsentCheckbox({
  checked,
  onChange,
  id = "legal-consent",
  className = "",
}: LegalConsentCheckboxProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 rounded-xl bg-cream/60 px-3 py-3 ring-1 ring-chocolate/8"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-chocolate/25 text-chocolate focus:ring-chocolate/30"
        />
        <span className="text-sm leading-relaxed text-chocolate/80">
          I agree to Sihi Bakes&apos;{" "}
          <Link
            href="/orders/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-chocolate underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/orders/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-chocolate underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <p className="mt-2 text-xs text-chocolate/50">
        We&apos;ll use your number for OTPs, order or enquiry updates, and support.
      </p>
    </div>
  );
}

export type { LegalConsentSource };
