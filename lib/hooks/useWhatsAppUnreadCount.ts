"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const FALLBACK_REFRESH_MS = 60_000;

export function useWhatsAppUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const realtimeOkRef = useRef(false);

  const fetchUnread = useCallback(async () => {
    const res = await fetch("/api/admin/whatsapp/unread-count");
    if (!res.ok) return;
    const data = await res.json();
    setUnreadCount(data.unreadCount ?? 0);
  }, []);

  useEffect(() => {
    void fetchUnread();

    const supabase = createClient();
    const channel = supabase
      .channel("whatsapp-unread-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        () => {
          void fetchUnread();
        }
      )
      .subscribe((status) => {
        realtimeOkRef.current = status === "SUBSCRIBED";
      });

    const fallback = setInterval(() => {
      if (!realtimeOkRef.current) void fetchUnread();
    }, FALLBACK_REFRESH_MS);

    return () => {
      clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [fetchUnread]);

  return { unreadCount, refreshUnread: fetchUnread };
}
