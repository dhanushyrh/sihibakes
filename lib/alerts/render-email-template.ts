import { readFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE_PATH = join(
  process.cwd(),
  "lib/alerts/templates/admin-alert-email.html"
);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function severityBadgeStyle(severity: string): string {
  if (severity === "critical") {
    return "background-color: #fef2f2; color: #991b1b;";
  }
  return "background-color: #fffbeb; color: #92400e;";
}

function orderButtonRow(orderLink: string | null): string {
  if (!orderLink) return "";

  const href = escapeHtml(orderLink);
  return `<tr>
              <td style="padding: 24px 32px 0" align="center">
                <a
                  href="${href}"
                  style="
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4b2c20;
                    color: #faf7f4;
                    text-decoration: none;
                    border-radius: 999px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                      Roboto, sans-serif;
                    font-size: 14px;
                    font-weight: 600;
                  "
                >
                  View order in admin
                </a>
              </td>
            </tr>`;
}

export type AdminAlertEmailTemplateData = {
  subject: string;
  title: string;
  message: string;
  severity: string;
  alertType: string;
  orderLabel: string;
  createdAt: string;
  orderLink: string | null;
};

export function renderAdminAlertEmail(data: AdminAlertEmailTemplateData): string {
  let html = readFileSync(TEMPLATE_PATH, "utf8");

  const replacements: Record<string, string> = {
    SUBJECT: escapeHtml(data.subject),
    TITLE: escapeHtml(data.title),
    MESSAGE: escapeHtml(data.message),
    SEVERITY: escapeHtml(data.severity),
    SEVERITY_BADGE_STYLE: severityBadgeStyle(data.severity),
    ALERT_TYPE: escapeHtml(data.alertType),
    ORDER_LABEL: escapeHtml(data.orderLabel),
    CREATED_AT: escapeHtml(data.createdAt),
    ORDER_BUTTON_ROW: orderButtonRow(data.orderLink),
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  return html;
}
