export type WhatsAppErrorSeverity = "warning" | "critical";

export type ParsedWhatsAppError = {
  message: string;
  severity: WhatsAppErrorSeverity;
  isAuthError: boolean;
};

function isAuthErrorMessage(message: string, code?: number): boolean {
  if (code === 190 || code === 10) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("authentication") ||
    lower.includes("access token") ||
    lower.includes("invalid_auth_token") ||
    lower.includes("oauth") ||
    lower.includes("session has expired")
  );
}

export function parseWhatsAppApiError(error?: {
  message?: string;
  code?: number;
  error_subcode?: number;
}): ParsedWhatsAppError {
  const raw = error?.message?.trim() || "WhatsApp API request failed";
  const code = error?.code;

  if (code === 131030 || raw.includes("not in allowed list")) {
    return {
      message:
        "Recipient phone number not on Meta test allow list (add under WhatsApp → API Setup → To).",
      severity: "warning",
      isAuthError: false,
    };
  }

  if (
    code === 131058 ||
    raw.toLowerCase().includes("hello world") ||
    raw.toLowerCase().includes("public test number")
  ) {
    return {
      message:
        "Meta sample/test templates (e.g. hello_world, jaspers_market_order_confirmation_v1) only work on public test numbers. Set WHATSAPP_TEMPLATE_ORDER_PLACED=order_confirmed to use your approved Sihi template.",
      severity: "critical",
      isAuthError: false,
    };
  }

  if (
    error?.error_subcode === 2388185 ||
    raw.includes("does not have permission to create message template")
  ) {
    return {
      message:
        "This WhatsApp Business account cannot create AUTHENTICATION templates yet. Meta requires messaging tier TIER_2K (2,000 business-initiated conversations/day). Your number is likely on TIER_250. Grow message volume or create the template in WhatsApp Manager once eligible.",
      severity: "warning",
      isAuthError: false,
    };
  }

  if (isAuthErrorMessage(raw, code)) {
    return {
      message: raw,
      severity: "critical",
      isAuthError: true,
    };
  }

  if (raw.includes("Template name does not exist")) {
    return {
      message: raw,
      severity: "critical",
      isAuthError: false,
    };
  }

  return {
    message: raw,
    severity: "warning",
    isAuthError: false,
  };
}

/** Format for logs and admin alerts — includes API code when present. */
export function formatWhatsAppErrorForAdmin(error?: {
  message?: string;
  code?: number;
  error_subcode?: number;
  error_user_msg?: string;
}): string {
  const parsed = parseWhatsAppApiError(error);
  const detail = error?.error_user_msg?.trim();
  const codeSuffix =
    error?.code != null ? ` (Meta error code ${error.code})` : "";
  if (detail && !parsed.message.includes(detail)) {
    return `${parsed.message} ${detail}${codeSuffix}`;
  }
  return `${parsed.message}${codeSuffix}`;
}
