import { createAdminClient } from "@/lib/supabase/admin";
import { createAdminAlert } from "@/lib/alerts/notify-admin";
import type { AdminAlertSeverity } from "@/lib/alerts/notify-admin";
import { parseWhatsAppApiError } from "@/lib/whatsapp/errors";

export async function alertOrderPlacedWhatsAppFailure(params: {
  orderId: string;
  errorDetail: string;
  severity: AdminAlertSeverity;
  isAuthError: boolean;
  customerPhone?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("order_number, phone")
    .eq("id", params.orderId)
    .single();

  const orderNumber = order?.order_number ?? params.orderId;
  const phone = params.customerPhone ?? order?.phone ?? "—";

  const title = params.isAuthError
    ? "WhatsApp token expired — order confirmations failing"
    : "WhatsApp order confirmation failed";

  const messageLines = [
    `Order ${orderNumber} did not receive a WhatsApp confirmation.`,
    `Customer phone: ${phone}`,
    "",
    `Error: ${params.errorDetail}`,
  ];

  if (params.isAuthError) {
    messageLines.push(
      "",
      "Refresh WHATSAPP_ACCESS_TOKEN in Meta Developers and update Vercel/.env.local."
    );
  }

  await createAdminAlert({
    alertType: "whatsapp_order_placed_failed",
    severity: params.severity,
    title,
    message: messageLines.join("\n"),
    orderId: params.orderId,
    metadata: {
      order_number: orderNumber,
      customer_phone: phone,
      is_auth_error: params.isAuthError,
    },
  });
}

export function classifyPlainWhatsAppError(errorMessage: string): {
  severity: AdminAlertSeverity;
  isAuthError: boolean;
} {
  const parsed = parseWhatsAppApiError({ message: errorMessage });
  return { severity: parsed.severity, isAuthError: parsed.isAuthError };
}
