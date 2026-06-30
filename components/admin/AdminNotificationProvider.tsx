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
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminNotificationCounts,
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
  notificationsSupported: boolean;
  notificationPermission: NotificationPermission | "unsupported";
};

const AdminNotificationContext = createContext<AdminNotificationContextValue | null>(
  null
);

const EMPTY_COUNTS: AdminNotificationCounts = {
  pendingOrders: 0,
  whatsappUnread: 0,
  newEnquiries: 0,
};

const FALLBACK_MS = 45_000;

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<AdminNotificationCounts>(EMPTY_COUNTS);
  const [feed, setFeed] = useState<AdminNotificationItem[]>([]);
  const [feedTotalCount, setFeedTotalCount] = useState(0);
  const [feedOpen, setFeedOpen] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [showEnableBanner, setShowEnableBanner] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const countsRef = useRef<AdminNotificationCounts>(EMPTY_COUNTS);
  const initializedRef = useRef(false);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const alertUser = useCallback(
    (params: {
      title: string;
      body: string;
      tag: string;
      url?: string;
      playSound?: boolean;
    }) => {
      if (params.playSound !== false) playAdminAlertSound();
      showAdminBrowserNotification({
        title: params.title,
        body: params.body,
        tag: params.tag,
        url: params.url,
      });
    },
    []
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
              ? "A new paid order is awaiting confirmation."
              : `${delta} new paid orders need attention.`,
          tag: "admin-order",
          url: "/admin/orders?status=pending",
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
    }
    countsRef.current = data;
    setCounts(data);
    document.title = formatAdminDocumentTitle(data);
  }, [alertUser]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCounts(), refreshFeed()]);
  }, [refreshCounts, refreshFeed]);

  const scheduleRefresh = useCallback(() => {
    window.setTimeout(() => void refreshAll(), 400);
  }, [refreshAll]);

  const dismissNotification = useCallback(
    async (item: AdminNotificationItem) => {
      if (!item.dismissible || item.type !== "alert") return;
      const alertId = item.id.replace(/^alert-/, "");
      const res = await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId }),
      });
      if (res.ok) await refreshAll();
    },
    [refreshAll]
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
    void refreshAll().then(() => {
      initializedRef.current = true;
    });

    const supabase = createClient();
    let realtimeOk = false;

    const onWhatsAppMessageInsert = (payload: {
      new: Record<string, unknown> | null;
    }) => {
      if (!initializedRef.current) return;
      const row = payload.new;
      if (!row || row.direction !== "inbound") return;

      const conversationId = String(row.conversation_id ?? "");
      const viewingId = getViewingWhatsAppConversationId();
      const onWhatsAppPage = pathnameRef.current.startsWith("/admin/whatsapp");
      const viewingThisThread =
        onWhatsAppPage &&
        viewingId === conversationId &&
        document.visibilityState === "visible" &&
        document.hasFocus();

      if (viewingThisThread) return;

      alertUser({
        title: "WhatsApp message",
        body: "A customer sent a new WhatsApp message.",
        tag: `admin-wa-${row.id ?? row.wa_message_id}`,
        url: "/admin/whatsapp",
      });
      void refreshAll();
    };

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => scheduleRefresh()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contact_enquiries" },
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
      .subscribe((status) => {
        realtimeOk = status === "SUBSCRIBED";
      });

    const fallback = setInterval(() => {
      if (!realtimeOk) void refreshAll();
    }, FALLBACK_MS);

    return () => {
      clearInterval(fallback);
      void supabase.removeChannel(channel);
      document.title = "Sihi Bakes Admin";
    };
  }, [alertUser, refreshAll, scheduleRefresh]);

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
        notificationsSupported,
        notificationPermission,
      }}
    >
      {showEnableBanner && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl bg-[#4B2C20] p-4 text-white shadow-lg ring-1 ring-black/10">
          <div className="flex items-start gap-3">
            <Bell size={20} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Enable admin alerts</p>
              <p className="mt-1 text-xs text-white/75">
                Get a sound and notification when new orders or WhatsApp messages
                arrive. Recommended for iPad.
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
