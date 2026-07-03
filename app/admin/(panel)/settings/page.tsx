import { AdminSettingsPageClient } from "@/app/admin/(panel)/settings/AdminSettingsPageClient";
import {
  getAdminOrderAlertPhone,
  isWhatsAppConfigured,
} from "@/lib/whatsapp/config";

export default function AdminSettingsPage() {
  return (
    <AdminSettingsPageClient
      whatsappConfigured={isWhatsAppConfigured()}
      adminAlertPhoneConfigured={Boolean(getAdminOrderAlertPhone())}
    />
  );
}
