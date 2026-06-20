import Link from "next/link";
import { BRAND } from "@/lib/constants";
import type { StoreContactDetails } from "@/lib/storefront";
import { telHref } from "@/lib/storefront";

export type { StoreContactDetails };

export function OrdersPausedBanner({
  accepting,
  message,
  storeClosed = false,
}: {
  accepting: boolean;
  message?: string;
  storeClosed?: boolean;
}) {
  if (accepting && !message) return null;
  const text =
    message ??
    "Store closed — we're not taking orders at the moment. Please check back soon.";
  return (
    <div
      className={`px-4 py-2.5 text-center text-sm text-white ${
        storeClosed ? "bg-red-900" : "bg-[#4B2C20]"
      }`}
      role="status"
    >
      {storeClosed && (
        <span className="mr-1.5 inline-block rounded bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Store closed
        </span>
      )}
      {text}
    </div>
  );
}

export function StoreFooter({ contact }: { contact?: StoreContactDetails }) {
  const hasContact =
    contact?.store_address ||
    contact?.fssai_license_no ||
    contact?.phone ||
    contact?.alt_phone;

  return (
    <footer className="border-t border-[#4B2C20]/10 bg-[#4B2C20] px-4 py-8 text-center text-[#F5E6D3]">
      <p className="font-serif text-lg font-semibold">{BRAND.name}</p>
      <p className="mt-1 text-sm opacity-70">{BRAND.tagline}</p>
      {hasContact && (
        <div className="mx-auto mt-4 max-w-md space-y-1 text-xs opacity-80">
          {contact?.store_address && <p>{contact.store_address}</p>}
          {contact?.fssai_license_no && (
            <p>FSSAI: {contact.fssai_license_no}</p>
          )}
          {(contact?.phone || contact?.alt_phone) && (
            <p>
              {[contact.phone, contact.alt_phone]
                .filter(Boolean)
                .map((phone, i) => (
                  <span key={phone}>
                    {i > 0 && " · "}
                    <a href={telHref(phone!)} className="hover:opacity-100">
                      {phone}
                    </a>
                  </span>
                ))}
            </p>
          )}
        </div>
      )}
      <p className="mt-4 text-xs opacity-50">
        Handcrafted desserts, delivered with love.
      </p>
      <div className="mt-4 flex justify-center gap-4 text-xs opacity-60">
        <Link href="/orders" className="hover:opacity-100">
          Order
        </Link>
        <Link href="/menu" className="hover:opacity-100">
          Menu
        </Link>
        <Link href="/admin/login" className="hover:opacity-100">
          Admin
        </Link>
      </div>
    </footer>
  );
}
