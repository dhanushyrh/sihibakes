"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { WHATSAPP_ADMIN_TEMPLATE_OPTIONS, WHATSAPP_CONVERSATIONS_PAGE_SIZE } from "@/lib/constants";
import { setViewingWhatsAppConversationId } from "@/lib/admin-notifications";
import { Skeleton } from "@/components/admin/ui/Skeleton";
import { Spinner } from "@/components/admin/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import type { WhatsAppConversation, WhatsAppMessage } from "@/lib/types";

const FALLBACK_REFRESH_MS = 60_000;

function sortConversations(rows: WhatsAppConversation[]): WhatsAppConversation[] {
  return [...rows].sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });
}

function mergeConversation(
  prev: WhatsAppConversation[],
  row: WhatsAppConversation
): WhatsAppConversation[] {
  const existing = prev.find((c) => c.id === row.id);
  const merged = { ...existing, ...row, customer: existing?.customer ?? row.customer };
  return sortConversations([merged, ...prev.filter((c) => c.id !== row.id)]);
}

type ConversationWithWindow = WhatsAppConversation & {
  serviceWindowOpen?: boolean;
  serviceWindowExpiresAt?: string | null;
};

function displayName(conversation: WhatsAppConversation): string {
  return (
    conversation.display_name?.trim() ||
    conversation.customer?.name?.trim() ||
    conversation.phone
  );
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const outbound = message.direction === "outbound";
  const label =
    message.message_type === "template"
      ? message.template_name ?? "Template"
      : message.message_type;

  return (
    <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
          outbound
            ? "rounded-br-md bg-[#4B2C20] text-white"
            : "rounded-bl-md bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
        }`}
      >
        {message.message_type === "template" && (
          <p className={`mb-1 text-[10px] font-medium uppercase tracking-wide ${outbound ? "text-white/70" : "text-[#4B2C20]/50"}`}>
            Template: {message.template_name}
          </p>
        )}
        {message.message_type === "auto_reply" && (
          <p className={`mb-1 text-[10px] font-medium uppercase tracking-wide ${outbound ? "text-white/70" : "text-[#4B2C20]/50"}`}>
            Auto-reply
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">
          {message.body?.trim() ||
            (message.message_type === "template"
              ? "[Template message]"
              : `[${label}]`)}
        </p>
        <div
          className={`mt-1 flex items-center gap-2 text-[10px] ${
            outbound ? "text-white/60" : "text-[#4B2C20]/45"
          }`}
        >
          <span>{format(new Date(message.created_at), "MMM d, h:mm a")}</span>
          {outbound && <span>{message.status}</span>}
        </div>
      </div>
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="space-y-0 p-2" aria-busy aria-label="Loading conversations">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-b border-[#4B2C20]/5 px-2 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-24" />
          <Skeleton className="mt-2 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

function MessageThreadSkeleton() {
  return (
    <div className="space-y-3 p-2" aria-busy aria-label="Loading messages">
      <div className="flex justify-start">
        <Skeleton className="h-16 w-48 rounded-2xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-56 rounded-2xl" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-10 w-40 rounded-2xl" />
      </div>
    </div>
  );
}

export function WhatsAppChatPanel() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] =
    useState<ConversationWithWindow | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    WHATSAPP_ADMIN_TEMPLATE_OPTIONS[0]?.key ?? "order_confirmed"
  );
  const [error, setError] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const realtimeOkRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadConversations = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingList(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("pageSize", String(WHATSAPP_CONVERSATIONS_PAGE_SIZE));
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/admin/whatsapp/conversations?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load conversations");
        setConversations([]);
      } else {
        const rows = (data.conversations ?? []) as WhatsAppConversation[];
        setConversations(rows);
      }
      if (!options?.silent) setLoadingList(false);
    },
    [searchQuery]
  );

  const loadThread = useCallback(
    async (
      conversationId: string,
      options?: { markRead?: boolean; silent?: boolean }
    ) => {
      const markRead = options?.markRead !== false;
      if (!options?.silent) setLoadingThread(true);
      setError(null);
      const query = markRead ? "" : "?markRead=0";
      const res = await fetch(
        `/api/admin/whatsapp/conversations/${conversationId}/messages${query}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load messages");
        setMessages([]);
        setActiveConversation(null);
      } else {
        setActiveConversation(data.conversation as ConversationWithWindow);
        setMessages((data.messages ?? []) as WhatsAppMessage[]);
        if (markRead) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId ? { ...c, unread_count: 0 } : c
            )
          );
        }
      }
      if (!options?.silent) setLoadingThread(false);
    },
    []
  );

  useEffect(() => {
    setTotalUnread(
      conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
    );
  }, [conversations]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setViewingWhatsAppConversationId(null);
      return;
    }
    setViewingWhatsAppConversationId(selectedId);
    void loadThread(selectedId, { markRead: true });
  }, [selectedId, loadThread]);

  useEffect(() => {
    return () => setViewingWhatsAppConversationId(null);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const convChannel = supabase
      .channel("whatsapp-chat-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        (payload) => {
          if (payload.eventType === "DELETE" && payload.old) {
            const old = payload.old as WhatsAppConversation;
            setConversations((prev) => prev.filter((c) => c.id !== old.id));
            return;
          }
          if (payload.new) {
            const row = payload.new as WhatsAppConversation;
            setConversations((prev) => mergeConversation(prev, row));
            if (row.id === selectedIdRef.current) {
              setActiveConversation((prev) =>
                prev ? { ...prev, ...row } : prev
              );
            }
          }
        }
      )
      .subscribe((status) => {
        realtimeOkRef.current = status === "SUBSCRIBED";
      });

    const fallback = setInterval(() => {
      if (!realtimeOkRef.current) {
        void loadConversations({ silent: true });
        if (selectedIdRef.current) {
          void loadThread(selectedIdRef.current, {
            markRead: false,
            silent: true,
          });
        }
      }
    }, FALLBACK_REFRESH_MS);

    return () => {
      clearInterval(fallback);
      void supabase.removeChannel(convChannel);
    };
  }, [loadConversations, loadThread]);

  useEffect(() => {
    if (!selectedId) return;

    const supabase = createClient();

    const markReadIfViewing = async () => {
      await fetch(`/api/admin/whatsapp/conversations/${selectedId}/read`, {
        method: "POST",
      });
    };

    const msgChannel = supabase
      .channel(`whatsapp-chat-messages-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        async (payload) => {
          const msg = payload.new as WhatsAppMessage;
          setMessages((prev) => {
            if (
              prev.some(
                (m) =>
                  m.id === msg.id ||
                  (msg.wa_message_id && m.wa_message_id === msg.wa_message_id)
              )
            ) {
              return prev;
            }
            return [...prev, msg];
          });
          if (msg.direction === "inbound") {
            const shouldMarkRead =
              document.visibilityState === "visible" &&
              document.hasFocus() &&
              selectedIdRef.current === selectedId;
            if (shouldMarkRead) {
              await markReadIfViewing();
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === selectedId ? { ...c, unread_count: 0 } : c
                )
              );
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const msg = payload.new as WhatsAppMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m))
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(msgChannel);
    };
  }, [selectedId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(
      `/api/admin/whatsapp/conversations/${selectedId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      }
    );
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to send message");
      return;
    }

    setDraft("");
    await loadThread(selectedId, { markRead: false, silent: true });
  };

  const sendTemplate = async () => {
    if (!selectedId || !selectedTemplate) return;
    setSendingTemplate(true);
    setError(null);
    const res = await fetch(
      `/api/admin/whatsapp/conversations/${selectedId}/templates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateName: selectedTemplate }),
      }
    );
    const data = await res.json();
    setSendingTemplate(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to send template");
      return;
    }

    await loadThread(selectedId, { markRead: false, silent: true });
  };

  const serviceWindowOpen = activeConversation?.serviceWindowOpen ?? false;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#4B2C20]/10 md:hidden"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <MessageCircle size={22} className="text-[#4B2C20]" />
            <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
              WhatsApp Chat
            </h1>
            {totalUnread > 0 && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                {totalUnread} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            Reply within 24 hours of the customer&apos;s last message, or send an approved template.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadConversations();
            if (selectedId) {
              void loadThread(selectedId, { markRead: false });
            }
          }}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm text-[#4B2C20] ring-1 ring-[#4B2C20]/10 hover:bg-[#F5E6D3]/40"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="relative mt-4 sm:mt-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B2C20]/40"
        />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name or phone..."
          className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-sm ring-1 ring-[#4B2C20]/10 outline-none focus:ring-[#4B2C20]/25"
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid min-h-[70vh] gap-4 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10">
          <div className="border-b border-[#4B2C20]/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#4B2C20]/50">
            Conversations
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loadingList ? (
              <ConversationListSkeleton />
            ) : conversations.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#4B2C20]/50">
                No conversations yet. Messages appear here when customers reply on WhatsApp.
              </p>
            ) : (
              conversations.map((conversation) => {
                const active = conversation.id === selectedId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full border-b border-[#4B2C20]/5 px-4 py-3 text-left transition last:border-0 ${
                      active ? "bg-[#F5E6D3]/50" : "hover:bg-[#F5E6D3]/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#4B2C20]">
                          {displayName(conversation)}
                        </p>
                        <p className="text-xs text-[#4B2C20]/50">
                          {formatPhone(conversation.phone)}
                        </p>
                      </div>
                      {conversation.unread_count > 0 && (
                        <span className="shrink-0 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    {conversation.last_message_preview && (
                      <p className="mt-1 truncate text-xs text-[#4B2C20]/60">
                        {conversation.last_message_preview}
                      </p>
                    )}
                    {conversation.last_message_at && (
                      <p className="mt-1 text-[10px] text-[#4B2C20]/40">
                        {formatDistanceToNow(new Date(conversation.last_message_at), {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl bg-[#F5E6D3]/20 ring-1 ring-[#4B2C20]/10">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#4B2C20]/50">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="border-b border-[#4B2C20]/10 bg-white px-4 py-3">
                {activeConversation ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-[#4B2C20]">
                        {displayName(activeConversation)}
                      </p>
                      <p className="text-xs text-[#4B2C20]/50">
                        {formatPhone(activeConversation.phone)}
                      </p>
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                        serviceWindowOpen
                          ? "bg-green-50 text-green-800 ring-green-200"
                          : "bg-amber-50 text-amber-800 ring-amber-200"
                      }`}
                    >
                      <Clock size={12} />
                      {serviceWindowOpen
                        ? activeConversation.serviceWindowExpiresAt
                          ? `Reply until ${format(new Date(activeConversation.serviceWindowExpiresAt), "MMM d, h:mm a")}`
                          : "Reply window open"
                        : "Template required"}
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-10 w-48" />
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingThread ? (
                  <MessageThreadSkeleton />
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-[#4B2C20]/50">
                    No messages in this thread yet.
                  </p>
                ) : (
                  messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))
                )}
                <div ref={threadEndRef} />
              </div>

              <div className="border-t border-[#4B2C20]/10 bg-white p-4">
                {serviceWindowOpen ? (
                  <div className="flex gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                      placeholder="Type a reply..."
                      className="min-h-[44px] flex-1 resize-none rounded-xl bg-[#F5E6D3]/20 px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10 outline-none focus:ring-[#4B2C20]/25"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendReply();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void sendReply()}
                      disabled={sending || !draft.trim()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4B2C20] text-white disabled:opacity-50"
                    >
                      {sending ? <Spinner size="sm" className="!text-white" /> : <Send size={18} />}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#4B2C20]/60">
                      The 24-hour reply window is closed. Send an approved template to reach the customer.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="flex-1 rounded-xl bg-[#F5E6D3]/20 px-3 py-2.5 text-sm ring-1 ring-[#4B2C20]/10"
                      >
                        {WHATSAPP_ADMIN_TEMPLATE_OPTIONS.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void sendTemplate()}
                        disabled={sendingTemplate}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4B2C20] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {sendingTemplate && <Spinner size="sm" className="!text-white" />}
                        {sendingTemplate ? "Sending…" : "Send template"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
