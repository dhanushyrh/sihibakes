"use client";

import { useState } from "react";
import Link from "next/link";
import { WhatsAppChatPanel } from "@/components/admin/whatsapp/WhatsAppChatPanel";
import { WhatsAppTemplatesPanel } from "@/components/admin/whatsapp/WhatsAppTemplatesPanel";

type Tab = "chat" | "templates";

type AdminWhatsAppPageClientProps = {
  whatsappConfigured: boolean;
};

export function AdminWhatsAppPageClient({
  whatsappConfigured,
}: AdminWhatsAppPageClientProps) {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="-mx-4 -mb-4 flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:-mx-8 md:-mb-8 md:h-[calc(100dvh-6rem)]">
      <div className="shrink-0 border-b border-[#4B2C20]/10 bg-[#F5E6D3]/20 px-4 pt-4 md:px-6">
        <p className="mb-3 text-xs text-[#4B2C20]/65">
          Message and alert toggles are in{" "}
          <Link href="/admin/settings" className="font-medium text-[#4B2C20] underline">
            Settings → Features & notifications
          </Link>
          .
        </p>

        {!whatsappConfigured && (
          <div className="mb-3 rounded-xl border border-[#4B2C20]/10 bg-white px-4 py-2.5 text-sm text-[#4B2C20]/70">
            WhatsApp credentials are not configured. Set WHATSAPP_ACCESS_TOKEN and
            WHATSAPP_PHONE_NUMBER_ID in your environment to enable messaging.
          </div>
        )}

        <div className="flex gap-2">
          {(
            [
              { key: "chat" as const, label: "Chat" },
              { key: "templates" as const, label: "Templates" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-t-xl px-4 py-2 text-sm font-medium transition ${
                tab === key
                  ? "bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10 ring-b-transparent"
                  : "text-[#4B2C20]/60 hover:text-[#4B2C20]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "chat" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <WhatsAppChatPanel />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <WhatsAppTemplatesPanel />
        </div>
      )}
    </div>
  );
}
