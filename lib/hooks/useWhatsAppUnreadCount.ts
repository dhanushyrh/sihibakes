"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const POLL_MS = 15_000;

export function useWhatsAppUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

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
      .subscribe();

    const poll = setInterval(() => {
      void fetchUnread();
    }, POLL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void fetchUnread();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [fetchUnread]);

  return { unreadCount, refreshUnread: fetchUnread };
}
