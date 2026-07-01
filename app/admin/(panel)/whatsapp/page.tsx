import { AdminWhatsAppPageClient } from "@/app/admin/(panel)/whatsapp/WhatsAppPageClient";
import { isWhatsAppConfigured } from "@/lib/whatsapp/config";

export default function AdminWhatsAppPage() {
  return <AdminWhatsAppPageClient whatsappConfigured={isWhatsAppConfigured()} />;
}
