"use client";

import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

type PreOrdersSplashModalProps = {
  open: boolean;
  onContinue: () => void;
};

export function PreOrdersSplashModal({
  open,
  onContinue,
}: PreOrdersSplashModalProps) {
  useLockBodyScroll(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preorders-splash-title"
        className="relative z-10 w-full max-w-lg rounded-t-3xl bg-cream pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex flex-col items-center pt-3">
          <div className="h-1 w-10 rounded-full bg-chocolate/15" />
        </div>

        <div className="flex flex-col items-center px-5 pb-6 pt-5 text-center">
          <video
            src="/orders/dance-stars.webm"
            autoPlay
            loop
            muted
            playsInline
            className="h-28 w-28 object-contain"
            aria-hidden
          />
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
