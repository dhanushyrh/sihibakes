"use client";

import { useState } from "react";
import { WhatsAppChatPanel } from "@/components/admin/whatsapp/WhatsAppChatPanel";
import { WhatsAppTemplatesPanel } from "@/components/admin/whatsapp/WhatsAppTemplatesPanel";

type Tab = "chat" | "templates";

export default function AdminWhatsAppPage() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div>
      <div className="border-b border-[#4B2C20]/10 bg-[#F5E6D3]/20 px-4 pt-4 md:px-8">
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
      {tab === "chat" ? <WhatsAppChatPanel /> : (
        <div className="p-4 md:p-8">
          <WhatsAppTemplatesPanel />
        </div>
      )}
    </div>
  );
}
