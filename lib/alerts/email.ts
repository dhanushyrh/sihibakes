import nodemailer from "nodemailer";
import type { AdminAlert } from "@/lib/alerts/notify-admin";
import { renderAdminAlertEmail } from "@/lib/alerts/render-email-template";

function getSmtpConfig() {
  const to = process.env.ADMIN_ALERT_EMAIL?.trim();
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "Sihi Bakes";

  if (!to || !user || !pass) return null;

  return {
    to,
    from: `${fromName} <${user}>`,
    auth: { user, pass },
  };
}

function adminOrderUrl(orderId: string | null): string | null {
  if (!orderId) return null;
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/admin/orders/${orderId}`;
}

function buildPlainText(alert: AdminAlert, orderLabel: string, orderLink: string | null): string {
  const lines = [
    alert.title,
    "",
    alert.message,
    "",
    `Severity: ${alert.severity}`,
    `Type: ${alert.alert_type}`,
    `Order: ${orderLabel}`,
  ];
  if (orderLink) lines.push(`Admin: ${orderLink}`);
  lines.push("", `Time: ${alert.created_at}`);
  return lines.join("\n");
}

export async function sendAdminAlertEmail(alert: AdminAlert): Promise<boolean> {
  const config = getSmtpConfig();
  if (!config) return false;

  const orderLink = adminOrderUrl(alert.order_id);
  const orderMeta = alert.metadata as { order_number?: string } | null;
  const orderLabel = orderMeta?.order_number ?? alert.order_id ?? "—";
  const subject = `[Sihi Bakes] ${alert.title}`;

  const html = renderAdminAlertEmail({
    subject,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    alertType: alert.alert_type,
    orderLabel,
    createdAt: alert.created_at,
    orderLink,
  });

  const text = buildPlainText(alert, orderLabel, orderLink);

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: config.auth,
    });

    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject,
      text,
      html,
    });

    return true;
  } catch (err) {
    console.error("Gmail SMTP admin alert email failed:", err);
    return false;
  }
}
