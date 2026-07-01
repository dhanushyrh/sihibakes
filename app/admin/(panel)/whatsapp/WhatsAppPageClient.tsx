"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmSwitch } from "@/components/admin/ConfirmSwitch";
import { WhatsAppChatPanel } from "@/components/admin/whatsapp/WhatsAppChatPanel";
import { WhatsAppTemplatesPanel } from "@/components/admin/whatsapp/WhatsAppTemplatesPanel";
import { createClient } from "@/lib/supabase/client";
import type { ShopSettings } from "@/lib/types";

type Tab = "chat" | "templates";

type AdminWhatsAppPageClientProps = {
  whatsappConfigured: boolean;
};

export function AdminWhatsAppPageClient({
  whatsappConfigured,
}: AdminWhatsAppPageClientProps) {
  const [tab, setTab] = useState<Tab>("chat");
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [toggleSaving, setToggleSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("shop_settings").select("*").limit(1).single();
    if (data) {
      setSettings(data as ShopSettings);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const notificationsEnabled = settings?.whatsapp_notifications_enabled ?? true;

  const handleToggleNotifications = async (next: boolean) => {
    if (!settings?.id) return;
    setToggleSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("shop_settings")
      .update({
        whatsapp_notifications_enabled: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    setToggleSaving(false);
    if (!error) {
      setSettings({ ...settings, whatsapp_notifications_enabled: next });
    }
  };

  return (
    <div>
      <div className="border-b border-[#4B2C20]/10 bg-[#F5E6D3]/20 px-4 pt-4 md:px-8">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ConfirmSwitch
            active={notificationsEnabled}
            label="Automated WhatsApp messages"
            description="OTP, order updates, welcome auto-reply"
            confirmOn="Enable automated WhatsApp messages (OTP, order updates, welcome auto-reply)?"
            confirmOff="Pause automated WhatsApp messages? Manual replies and templates will still work."
            onToggle={(next) => void handleToggleNotifications(next)}
            disabled={toggleSaving || !whatsappConfigured || !settings}
          />
        </div>

        {!notificationsEnabled && whatsappConfigured && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            Automated WhatsApp messages are paused. Manual replies and templates still work.
          </div>
        )}

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
      {tab === "chat" ? <WhatsAppChatPanel /> : (
        <div className="p-4 md:p-8">
          <WhatsAppTemplatesPanel />
        </div>
      )}
    </div>
  );
}
