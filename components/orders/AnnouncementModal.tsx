"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import {
  hasSeenAnnouncement,
  markAnnouncementSeen,
} from "@/lib/announcement-session";
import type { SiteAnnouncement } from "@/lib/types";

type AnnouncementModalProps = {
  announcement: Pick<
    SiteAnnouncement,
    "id" | "title" | "description" | "disclaimer"
  > | null;
};

export function AnnouncementModal({ announcement }: AnnouncementModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!announcement) return;
    if (hasSeenAnnouncement(announcement.id)) return;
    setOpen(true);
  }, [announcement]);

  useLockBodyScroll(open);

  if (!announcement || !open) return null;

  const dismiss = () => {
    markAnnouncementSeen(announcement.id);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={dismiss}
        aria-label="Close announcement"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex flex-col items-center pt-3">
          <div className="h-1 w-10 rounded-full bg-chocolate/15" />
        </div>

        <div className="flex items-center justify-end px-5 pt-3">
          <button
            type="button"
            onClick={dismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-chocolate"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-6 pt-2">
          <h2
            id="announcement-title"
            className="font-display text-2xl font-semibold leading-tight text-chocolate"
          >
            {announcement.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-chocolate/80">
            {announcement.description}
          </p>
          {announcement.disclaimer && (
            <p className="mt-4 text-xs leading-relaxed text-chocolate/50">
              {announcement.disclaimer}
            </p>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="mt-6 w-full rounded-full bg-chocolate py-3 text-sm font-medium text-cream"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
