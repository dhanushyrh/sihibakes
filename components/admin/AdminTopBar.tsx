"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Bell,
  BellOff,
  MessageCircle,
  MessageSquare,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { AdminNotificationItem } from "@/lib/admin-notifications-feed";
import { unlockAdminAudio } from "@/lib/admin-notifications";
import { useAdminNotifications } from "@/components/admin/AdminNotificationProvider";

function itemIcon(type: AdminNotificationItem["type"]) {
  switch (type) {
    case "order":
      return ShoppingBag;
    case "enquiry":
      return MessageSquare;
    case "whatsapp":
      return MessageCircle;
    case "alert":
      return AlertTriangle;
  }
}

export function AdminTopBar() {
  const router = useRouter();
  const {
    feed,
    feedTotalCount,
    feedOpen,
    setFeedOpen,
    refreshFeed,
    dismissNotification,
    soundEnabled,
    setSoundEnabled,
    enableAlerts,
    notificationsSupported,
  } = useAdminNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!feedOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setFeedOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFeedOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [feedOpen, setFeedOpen]);

  useEffect(() => {
    if (feedOpen) void refreshFeed();
  }, [feedOpen, refreshFeed]);

  const badge =
    feedTotalCount > 99 ? "99+" : feedTotalCount > 0 ? String(feedTotalCount) : null;

  return (
    <div ref={panelRef} className="fixed right-4 top-4 z-40 md:right-8 md:top-8">
      <button
        type="button"
        onClick={() => setFeedOpen(!feedOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#4B2C20] shadow-sm ring-1 ring-[#4B2C20]/10 hover:bg-[#F5E6D3]/50"
        aria-label="Notifications"
        aria-expanded={feedOpen}
      >
        <Bell size={18} />
        {badge && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {badge}
          </span>
        )}
      </button>

      {feedOpen && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-[#4B2C20]/10">
          <div className="flex items-center justify-between border-b border-[#4B2C20]/10 px-4 py-3">
            <p className="text-sm font-semibold text-[#4B2C20]">Notifications</p>
            <button
              type="button"
              onClick={() => setFeedOpen(false)}
              className="rounded-lg p-1 text-[#4B2C20]/50 hover:bg-[#F5E6D3]/60"
              aria-label="Close notifications"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[min(60vh,24rem)] overflow-y-auto">
            {feed.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#4B2C20]/50">
                You&apos;re all caught up
              </p>
            ) : (
              <ul className="divide-y divide-[#4B2C20]/5">
                {feed.map((item) => {
                  const Icon = itemIcon(item.type);
                  return (
                    <li key={item.id}>
                      <div className="flex items-start gap-3 px-4 py-3 hover:bg-[#F5E6D3]/30">
                        <button
                          type="button"
                          onClick={() => {
                            setFeedOpen(false);
                            router.push(item.href);
                          }}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3] text-[#4B2C20]">
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-[#4B2C20]">
                              {item.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-[#4B2C20]/60">
                              {item.body}
                            </span>
                            <span className="mt-1 block text-[10px] text-[#4B2C20]/40">
                              {formatDistanceToNow(new Date(item.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </span>
                        </button>
                        {item.dismissible && (
                          <button
                            type="button"
                            onClick={() => void dismissNotification(item)}
                            className="shrink-0 rounded-lg p-1 text-[#4B2C20]/40 hover:bg-[#F5E6D3]/60 hover:text-[#4B2C20]"
                            aria-label="Dismiss alert"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-1 border-t border-[#4B2C20]/10 p-2">
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) unlockAdminAudio();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#4B2C20]/70 hover:bg-[#F5E6D3]/40"
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {soundEnabled ? "Sound alerts on" : "Sound alerts off"}
            </button>
            {notificationsSupported && (
              <button
                type="button"
                onClick={() => void enableAlerts()}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#4B2C20]/70 hover:bg-[#F5E6D3]/40"
              >
                <BellOff size={14} />
                Enable browser notifications
              </button>
            )}
            <Link
              href="/admin/settings"
              onClick={() => setFeedOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#4B2C20]/70 hover:bg-[#F5E6D3]/40"
            >
              Account settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
