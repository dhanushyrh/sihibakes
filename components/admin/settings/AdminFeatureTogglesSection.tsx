"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmSwitch } from "@/components/admin/ConfirmSwitch";
import { createClient } from "@/lib/supabase/client";
import type { ShopSettings } from "@/lib/types";

type FeatureToggleField =
  | "orders_accepting"
  | "whatsapp_notifications_enabled"
  | "admin_new_order_whatsapp_enabled"
  | "payment_skip_enabled";

type AdminFeatureTogglesSectionProps = {
  settings: ShopSettings;
  whatsappConfigured: boolean;
  adminAlertPhoneConfigured: boolean;
  onSettingsChange: (patch: Partial<ShopSettings>) => void;
};

export function AdminFeatureTogglesSection({
  settings,
  whatsappConfigured,
  adminAlertPhoneConfigured,
  onSettingsChange,
}: AdminFeatureTogglesSectionProps) {
  const [savingField, setSavingField] = useState<FeatureToggleField | null>(null);

  const updateToggle = async (field: FeatureToggleField, value: boolean) => {
    if (!settings.id) return;
    setSavingField(field);
    const supabase = createClient();
    const { error } = await supabase
      .from("shop_settings")
      .update({
        [field]: value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);
    setSavingField(null);
    if (!error) {
      onSettingsChange({ [field]: value });
    }
  };

  const adminAlertDisabled =
    savingField === "admin_new_order_whatsapp_enabled" ||
    !whatsappConfigured ||
    !adminAlertPhoneConfigured;

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <div>
        <h2 className="text-sm font-medium text-[#4B2C20]">Features & notifications</h2>
        <p className="mt-1 text-xs text-[#4B2C20]/50">
          Shop-wide switches for orders, WhatsApp, and checkout. Changes save immediately.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <ConfirmSwitch
          active={settings.orders_accepting}
          label="Accepting orders"
          description="Pause when the kitchen is closed or at capacity"
          confirmOn="Start accepting new customer orders?"
          confirmOff="Pause new orders? Customers will not be able to check out."
          onToggle={(next) => void updateToggle("orders_accepting", next)}
          disabled={savingField === "orders_accepting"}
        />

        <ConfirmSwitch
          active={settings.whatsapp_notifications_enabled ?? true}
          label="Automated WhatsApp messages"
          description="OTP, order updates, welcome auto-reply"
          confirmOn="Enable automated WhatsApp messages (OTP, order updates, welcome auto-reply)?"
          confirmOff="Pause automated WhatsApp messages? Manual replies and templates will still work."
          onToggle={(next) => void updateToggle("whatsapp_notifications_enabled", next)}
          disabled={
            savingField === "whatsapp_notifications_enabled" || !whatsappConfigured
          }
        />

        <ConfirmSwitch
          active={settings.admin_new_order_whatsapp_enabled ?? true}
          label="Staff new-order WhatsApp alert"
          description="WhatsApp to staff when a customer order is paid"
          confirmOn="Enable staff new-order WhatsApp alerts when payment succeeds?"
          confirmOff="Pause staff new-order WhatsApp alerts?"
          onToggle={(next) => void updateToggle("admin_new_order_whatsapp_enabled", next)}
          disabled={adminAlertDisabled}
        />

        <ConfirmSwitch
          active={settings.payment_skip_enabled ?? false}
          label="Skip payment (test mode)"
          description="Place orders without Razorpay while testing live keys"
          confirmOn="Enable skip payment? Orders will not go through Razorpay."
          confirmOff="Disable skip payment and require Razorpay checkout?"
          onToggle={(next) => void updateToggle("payment_skip_enabled", next)}
          disabled={savingField === "payment_skip_enabled"}
        />
      </div>

      {!whatsappConfigured && (
        <p className="mt-3 rounded-xl border border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-3 py-2 text-xs text-[#4B2C20]/70">
          WhatsApp credentials are not configured. Set WHATSAPP_ACCESS_TOKEN and
          WHATSAPP_PHONE_NUMBER_ID in your environment to enable messaging toggles.
        </p>
      )}

      {whatsappConfigured && !adminAlertPhoneConfigured && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Staff new-order alerts need WHATSAPP_ADMIN_ORDER_ALERT_PHONE in your environment.
        </p>
      )}

      {!settings.whatsapp_notifications_enabled && whatsappConfigured && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Automated WhatsApp messages are paused. Manual replies and templates still work on{" "}
          <Link href="/admin/whatsapp" className="font-medium underline">
            WhatsApp
          </Link>
          .
        </p>
      )}
    </section>
  );
}
