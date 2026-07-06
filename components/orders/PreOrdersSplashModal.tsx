"use client";

import Image from "next/image";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

const AUTO_CONTINUE_MS = 3500;

type PreOrdersSplashModalProps = {
  open: boolean;
  onContinue: () => void;
};

export function PreOrdersSplashModal({
  open,
  onContinue,
}: PreOrdersSplashModalProps) {
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(onContinue, AUTO_CONTINUE_MS);
    return () => window.clearTimeout(timer);
  }, [open, onContinue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onContinue}
        aria-label="Continue"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preorders-splash-title"
        className="relative z-10 w-full max-w-lg rounded-t-3xl bg-cream pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex flex-col items-center pt-3">
          <div className="h-1 w-10 rounded-full bg-chocolate/15" />
        </div>

        <div className="flex items-center justify-end px-5 pt-3">
          <button
            type="button"
            onClick={onContinue}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-chocolate"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center px-5 pb-6 pt-2 text-center">
          <div className="relative h-28 w-28">
            <Image
              src="/orders/dance-stars.png"
              alt=""
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          <h2
            id="preorders-splash-title"
            className="mt-4 font-display text-2xl font-semibold leading-tight text-chocolate"
          >
            We are now open for pre orders
          </h2>
          <p className="mt-3 text-sm text-chocolate/65">
            Fresh bakes and desserts — place your order today.
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="mt-6 w-full rounded-full bg-chocolate py-3 text-sm font-medium text-cream"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
