"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import {
  markAnnouncementsSeen,
} from "@/lib/announcement-session";
import type { PublicAnnouncement } from "@/lib/site-announcements";

type AnnouncementModalProps = {
  announcements: PublicAnnouncement[];
  open: boolean;
  onClose: () => void;
};

const AUTO_ADVANCE_MS = 3000;

function AnnouncementSlide({
  announcement,
  slideIndex,
  activeIndex,
}: {
  announcement: PublicAnnouncement;
  slideIndex: number;
  activeIndex: number;
}) {
  const isActive = slideIndex === activeIndex;

  return (
    <article
      className="box-border w-full min-w-full shrink-0 grow-0 basis-full snap-start snap-always px-5"
      aria-hidden={!isActive}
    >
      <h2
        id={`announcement-title-${announcement.id}`}
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
    </article>
  );
}

export function AnnouncementModal({
  announcements,
  open,
  onClose,
}: AnnouncementModalProps) {
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<
    PublicAnnouncement[]
  >([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pauseAutoAdvance, setPauseAutoAdvance] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    setVisibleAnnouncements(announcements);
    setActiveIndex(0);
  }, [announcements]);

  useEffect(() => {
    if (!open) return;
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = 0;
  }, [open, visibleAnnouncements]);

  useLockBodyScroll(open && visibleAnnouncements.length > 0);

  const dismiss = useCallback(() => {
    markAnnouncementsSeen(visibleAnnouncements.map((announcement) => announcement.id));
    onClose();
  }, [onClose, visibleAnnouncements]);

  const goToSlide = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;

    const nextIndex = Math.max(
      0,
      Math.min(index, visibleAnnouncements.length - 1)
    );
    const slideWidth = track.clientWidth;
    track.scrollTo({ left: nextIndex * slideWidth, behavior: "smooth" });
    setActiveIndex(nextIndex);
  }, [visibleAnnouncements.length]);

  const goNext = useCallback(() => {
    goToSlide(activeIndex + 1);
  }, [activeIndex, goToSlide]);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const track = trackRef.current;
      if (!track || track.clientWidth === 0) return;

      const closestIndex = Math.round(track.scrollLeft / track.clientWidth);
      const boundedIndex = Math.max(
        0,
        Math.min(closestIndex, visibleAnnouncements.length - 1)
      );

      setActiveIndex(boundedIndex);
    });
  }, [visibleAnnouncements.length]);

  useEffect(() => {
    if (!open || visibleAnnouncements.length <= 1) return;
    if (activeIndex >= visibleAnnouncements.length - 1) return;
    if (pauseAutoAdvance) return;

    const timer = window.setTimeout(() => {
      goToSlide(activeIndex + 1);
    }, AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    activeIndex,
    goToSlide,
    open,
    pauseAutoAdvance,
    visibleAnnouncements.length,
  ]);

  useEffect(() => {
    if (!open || visibleAnnouncements.length <= 1) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToSlide(activeIndex + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToSlide(activeIndex - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, goToSlide, open, visibleAnnouncements.length]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  if (!open || visibleAnnouncements.length === 0) return null;

  const isCarousel = visibleAnnouncements.length > 1;
  const isLast = activeIndex === visibleAnnouncements.length - 1;
  const activeAnnouncement = visibleAnnouncements[activeIndex];

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
        aria-labelledby={`announcement-title-${activeAnnouncement.id}`}
        aria-label={
          isCarousel
            ? `Announcement ${activeIndex + 1} of ${visibleAnnouncements.length}`
            : undefined
        }
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex flex-col items-center pt-3">
          <div className="h-1 w-10 rounded-full bg-chocolate/15" />
        </div>

        <div
          className={`flex items-center px-5 pt-3 ${
            isCarousel ? "justify-between" : "justify-end"
          }`}
        >
          {isCarousel ? (
            <div className="flex gap-1.5">
              {visibleAnnouncements.map((announcement, index) => (
                <button
                  key={announcement.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  className={`h-2 w-2 rounded-full transition ${
                    index === activeIndex ? "bg-chocolate" : "bg-chocolate/15"
                  }`}
                  aria-label={`Go to announcement ${index + 1}`}
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={dismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-chocolate"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {isCarousel ? (
          <>
            <div className="mt-2 overflow-hidden">
              <div
                ref={trackRef}
                onScroll={handleScroll}
                onPointerDown={() => setPauseAutoAdvance(true)}
                onPointerUp={() => setPauseAutoAdvance(false)}
                onPointerLeave={() => setPauseAutoAdvance(false)}
                onPointerCancel={() => setPauseAutoAdvance(false)}
                className="flex min-h-[12rem] snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {visibleAnnouncements.map((announcement, index) => (
                  <AnnouncementSlide
                    key={announcement.id}
                    announcement={announcement}
                    slideIndex={index}
                    activeIndex={activeIndex}
                  />
                ))}
              </div>
            </div>
            {activeIndex < visibleAnnouncements.length - 1 && (
              <p className="mt-3 text-center text-xs text-chocolate/45">
                Swipe for more →
              </p>
            )}
          </>
        ) : (
          <div className="min-h-[12rem] px-5 pt-2">
            <AnnouncementSlide
              announcement={visibleAnnouncements[0]}
              slideIndex={0}
              activeIndex={0}
            />
          </div>
        )}

        <div className="px-5 pb-6 pt-4">
          {isCarousel && !isLast ? (
            <button
              type="button"
              onClick={goNext}
              className="flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-sm font-medium text-chocolate ring-1 ring-chocolate/20"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="w-full rounded-full bg-chocolate py-3 text-sm font-medium text-cream"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
