"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminAlertParams,
  type AdminNotificationCounts,
  dispatchAdminOrdersChanged,
  formatAdminDocumentTitle,
  getViewingWhatsAppConversationId,
  isAdminSoundEnabled,
  playAdminAlertSound,
  requestAdminNotificationPermission,
  setAdminSoundEnabled,
  showAdminBrowserNotification,
  unlockAdminAudio,
} from "@/lib/admin-notifications";
import type { AdminNotificationItem } from "@/lib/admin-notifications-feed";

type AdminNotificationContextValue = {
  counts: AdminNotificationCounts;
  feed: AdminNotificationItem[];
  feedTotalCount: number;
  feedOpen: boolean;
  setFeedOpen: (open: boolean) => void;
  refreshFeed: () => Promise<void>;
  dismissNotification: (item: AdminNotificationItem) => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  enableAlerts: () => Promise<void>;
  /** Sound + browser notification + in-app toast. */
  notify: (params: AdminAlertParams) => void;
  notificationsSupported: boolean;
  notificationPermission: NotificationPermission | "unsupported";
};

type InAppToast = {
  title: string;
  body: string;
  url?: string;
};

const AdminNotificationContext = createContext<AdminNotificationContextValue | null>(
  null
);

const EMPTY_COUNTS: AdminNotificationCounts = {
  pendingOrders: 0,
  kitchenActiveToday: 0,
  whatsappUnread: 0,
  newEnquiries: 0,
};

const POLL_MS = 15_000;
const TOAST_MS = 4_000;
const INITIAL_COUNTS_DELAY_MS = 1_500;

function scheduleDeferredCounts(refreshCounts: () => Promise<void>) {
  const run = () => void refreshCounts();

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: INITIAL_COUNTS_DELAY_MS });
    return;
  }

  globalThis.setTimeout(run, INITIAL_COUNTS_DELAY_MS);
}

function shouldSkipWhatsAppAlert(conversationId?: string): boolean {
  if (!conversationId) return false;

  const viewingId = getViewingWhatsAppConversationId();
  const onWhatsAppPage =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin/whatsapp");
  return (
    onWhatsAppPage &&
    viewingId === conversationId &&
    document.visibilityState === "visible" &&
    document.hasFocus()
  );
}

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<AdminNotificationCounts>(EMPTY_COUNTS);
  const [feed, setFeed] = useState<AdminNotificationItem[]>([]);
  const [feedTotalCount, setFeedTotalCount] = useState(0);
  const [feedOpen, setFeedOpen] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [showEnableBanner, setShowEnableBanner] = useState(false);
  const [inAppToast, setInAppToast] = useState<InAppToast | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const countsRef = useRef<AdminNotificationCounts>(EMPTY_COUNTS);
  const initializedRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const feedOpenRef = useRef(feedOpen);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    feedOpenRef.current = feedOpen;
  }, [feedOpen]);

  const showInAppToast = useCallback((toast: InAppToast) => {
    setInAppToast(toast);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setInAppToast(null), TOAST_MS);
  }, []);

  const alertUser = useCallback(
    (params: AdminAlertParams) => {
      if (params.playSound !== false) playAdminAlertSound();
      showAdminBrowserNotification({
        title: params.title,
        body: params.body,
        tag: params.tag,
        url: params.url,
      });
      if (document.visibilityState === "visible" && document.hasFocus()) {
        showInAppToast({
          title: params.title,
          body: params.body,
          url: params.url,
        });
      }
    },
    [showInAppToast]
  );

  const refreshFeed = useCallback(async () => {
    const res = await fetch("/api/admin/notifications/feed");
    if (!res.ok) return;
    const data = (await res.json()) as {
      items: AdminNotificationItem[];
      totalCount: number;
    };
    setFeed(data.items ?? []);
    setFeedTotalCount(data.totalCount ?? 0);
  }, []);

  const refreshCounts = useCallback(async () => {
    const res = await fetch("/api/admin/notifications/counts");
    if (!res.ok) return;
    const data = (await res.json()) as AdminNotificationCounts;
    if (initializedRef.current) {
      const prev = countsRef.current;
      if (data.pendingOrders > prev.pendingOrders) {
        const delta = data.pendingOrders - prev.pendingOrders;
        alertUser({
          title: "New order",
          body:
            delta === 1
              ? "A new paid order needs kitchen prep."
              : `${delta} new paid orders need kitchen prep.`,
          tag: "admin-order",
          url: "/admin/kitchen",
        });
      }
      if (data.newEnquiries > prev.newEnquiries) {
        const delta = data.newEnquiries - prev.newEnquiries;
        alertUser({
          title: "New enquiry",
          body:
            delta === 1
              ? "A new customer enquiry was submitted."
              : `${delta} new enquiries were submitted.`,
          tag: "admin-enquiry",
          url: "/admin/enquiries",
        });
      }
      // WhatsApp alerts are handled solely by the realtime whatsapp_messages
      // INSERT handler (onWhatsAppMessageInsert). Alerting here too would play
      // the sound twice for the same message.
    }
    countsRef.current = data;
    setCounts(data);
    document.title = formatAdminDocumentTitle(data);
  }, [alertUser]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCounts(), refreshFeed()]);
  }, [refreshCounts, refreshFeed]);

  const scheduleRefresh = useCallback(() => {
    window.setTimeout(() => {
      if (feedOpenRef.current) void refreshAll();
      else void refreshCounts();
    }, 400);
  }, [refreshAll, refreshCounts]);

  const dismissNotification = useCallback(
    async (item: AdminNotificationItem) => {
      if (!item.dismissible || item.type !== "alert") return;
      const alertId = item.id.replace(/^alert-/, "");
      const res = await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId }),
      });
      if (res.ok) {
        await Promise.all([
          refreshCounts(),
          feed.length > 0 ? refreshFeed() : Promise.resolve(),
        ]);
      }
    },
    [refreshCounts, refreshFeed, feed.length]
  );

  const enableAlerts = useCallback(async () => {
    unlockAdminAudio();
    setAdminSoundEnabled(true);
    setSoundEnabledState(true);
    setShowEnableBanner(false);
    localStorage.setItem("sihi_admin_notify_asked", "true");

    if ("Notification" in window) {
      const permission = await requestAdminNotificationPermission();
      setNotificationPermission(permission);
    }
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setAdminSoundEnabled(enabled);
    setSoundEnabledState(enabled);
    if (enabled) unlockAdminAudio();
  }, []);

  useEffect(() => {
    setSoundEnabledState(isAdminSoundEnabled());
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission("unsupported");
    }

    const asked = localStorage.getItem("sihi_admin_notify_asked");
    if (!asked) setShowEnableBanner(true);
  }, []);

  useEffect(() => {
    const onPointerDown = () => unlockAdminAudio();
    document.addEventListener("pointerdown", onPointerDown, { once: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    scheduleDeferredCounts(async () => {
      await refreshCounts();
      initializedRef.current = true;
    });

    const supabase = createClient();

    const onWhatsAppMessageInsert = (payload: {
      new: Record<string, unknown> | null;
    }) => {
      if (!initializedRef.current) return;
      const row = payload.new;
      if (!row || row.direction !== "inbound") return;

      const conversationId = String(row.conversation_id ?? "");
      if (shouldSkipWhatsAppAlert(conversationId)) return;

      alertUser({
        title: "WhatsApp message",
        body: "A customer sent a new WhatsApp message.",
        tag: `admin-wa-${row.id ?? row.wa_message_id}`,
        url: "/admin/whatsapp",
      });
      void refreshCounts();
    };

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          dispatchAdminOrdersChanged();
          scheduleRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_enquiries" },
        () => scheduleRefresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_alerts" },
        () => scheduleRefresh()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages" },
        (payload) => onWhatsAppMessageInsert(payload as never)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        () => scheduleRefresh()
      )
      .subscribe();

    const poll = setInterval(() => {
      void refreshCounts();
    }, POLL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshCounts();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(poll);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
      document.title = "Sihi Bakes Admin";
    };
  }, [alertUser, refreshCounts, refreshAll, scheduleRefresh]);

  const notificationsSupported = notificationPermission !== "unsupported";

  return (
    <AdminNotificationContext.Provider
      value={{
        counts,
        feed,
        feedTotalCount,
        feedOpen,
        setFeedOpen,
        refreshFeed,
        dismissNotification,
        soundEnabled,
        setSoundEnabled,
        enableAlerts,
        notify: alertUser,
        notificationsSupported,
        notificationPermission,
      }}
    >
      {inAppToast && (
        <div className="fixed left-1/2 top-20 z-50 w-[min(100vw-2rem,24rem)] -translate-x-1/2 md:left-auto md:right-24 md:top-20 md:translate-x-0">
          <div className="flex items-start gap-3 rounded-2xl bg-[#4B2C20] p-4 text-white shadow-lg ring-1 ring-black/10">
            <Bell size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{inAppToast.title}</p>
              <p className="mt-0.5 text-xs text-white/75">{inAppToast.body}</p>
              {inAppToast.url && (
                <a
                  href={inAppToast.url}
                  className="mt-2 inline-block text-xs font-medium text-white underline"
                  onClick={() => setInAppToast(null)}
                >
                  View
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setInAppToast(null)}
              className="shrink-0 rounded-lg p-1 text-white/60 hover:text-white"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {showEnableBanner && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl bg-[#4B2C20] p-4 text-white shadow-lg ring-1 ring-black/10">
          <div className="flex items-start gap-3">
            <Bell size={20} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Enable admin alerts</p>
              <p className="mt-1 text-xs text-white/75">
                Sound and browser alerts for new orders (Kitchen), WhatsApp, and
                enquiries. Recommended for kitchen iPad.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void enableAlerts()}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#4B2C20]"
                >
                  Enable alerts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("sihi_admin_notify_asked", "true");
                    setShowEnableBanner(false);
                  }}
                  className="rounded-full px-3 py-1.5 text-xs text-white/80 hover:text-white"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotifications() {
  const ctx = useContext(AdminNotificationContext);
  if (!ctx) {
    throw new Error("useAdminNotifications must be used within AdminNotificationProvider");
  }
  return ctx;
}
