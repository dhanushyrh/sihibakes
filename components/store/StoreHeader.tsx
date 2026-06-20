import Link from "next/link";
import Image from "next/image";
import { BRAND } from "@/lib/constants";

export function StoreHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#4B2C20]/10 bg-[#F5E6D3]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt={BRAND.name}
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <p className="font-serif text-lg font-semibold leading-tight text-[#4B2C20]">
              {BRAND.name}
            </p>
            <p className="text-[10px] tracking-wide text-[#4B2C20]/60">
              {BRAND.tagline}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
