"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnnouncementModal } from "@/components/orders/AnnouncementModal";
import { PreOrdersSplashModal } from "@/components/orders/PreOrdersSplashModal";
import {
  filterUnseenAnnouncements,
  hasSeenPreOrdersSplash,
  markPreOrdersSplashSeen,
} from "@/lib/announcement-session";
import { isPreOrdersSplashActive } from "@/lib/preorders-splash";
import type { PublicAnnouncement } from "@/lib/site-announcements";

type OrdersHubModalsProps = {
  announcements: PublicAnnouncement[];
};

export function OrdersHubModals({ announcements }: OrdersHubModalsProps) {
  const unseenAnnouncements = useMemo(
    () => filterUnseenAnnouncements(announcements),
    [announcements]
  );
  const [showSplash, setShowSplash] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  useEffect(() => {
    const splashEligible =
      isPreOrdersSplashActive() && !hasSeenPreOrdersSplash();

    if (splashEligible) {
      setShowSplash(true);
      setShowAnnouncements(false);
      return;
    }

    setShowSplash(false);
    setShowAnnouncements(unseenAnnouncements.length > 0);
  }, [unseenAnnouncements]);

  const finishSplash = useCallback(() => {
    markPreOrdersSplashSeen();
    setShowSplash(false);
    setShowAnnouncements(unseenAnnouncements.length > 0);
  }, [unseenAnnouncements.length]);

  const closeAnnouncements = useCallback(() => {
    setShowAnnouncements(false);
  }, []);

  return (
    <>
      <PreOrdersSplashModal open={showSplash} onContinue={finishSplash} />
      <AnnouncementModal
        announcements={unseenAnnouncements}
        open={showAnnouncements}
        onClose={closeAnnouncements}
      />
    </>
  );
}
