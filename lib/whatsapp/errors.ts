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
}): string {
  const parsed = parseWhatsAppApiError(error);
  const codeSuffix =
    error?.code != null ? ` (Meta error code ${error.code})` : "";
  return `${parsed.message}${codeSuffix}`;
}
