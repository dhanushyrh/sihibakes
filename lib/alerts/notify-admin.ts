export type AdminAlertSeverity = "warning" | "critical";

export type AdminAlert = {
  id: string;
  alert_type: string;
  severity: AdminAlertSeverity;
  title: string;
  message: string;
  order_id: string | null;
  metadata: Record<string, unknown> | null;
  acknowledged_at: string | null;
  created_at: string;
};

export type CreateAdminAlertInput = {
  alertType: string;
  severity: AdminAlertSeverity;
  title: string;
  message: string;
  orderId?: string | null;
  metadata?: Record<string, unknown>;
};

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function createAdminAlert(
  input: CreateAdminAlertInput
): Promise<AdminAlert | null> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();

  let dedupQuery = admin
    .from("admin_alerts")
    .select("id")
    .eq("alert_type", input.alertType)
    .is("acknowledged_at", null)
    .gte("created_at", since)
    .limit(1);

  if (input.orderId) {
    dedupQuery = dedupQuery.eq("order_id", input.orderId);
  }

  const { data: existing } = await dedupQuery.maybeSingle();
  if (existing) return null;

  const { data, error } = await admin
    .from("admin_alerts")
    .insert({
      alert_type: input.alertType,
      severity: input.severity,
      title: input.title,
      message: input.message,
      order_id: input.orderId ?? null,
      metadata: input.metadata ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to create admin alert:", error);
    return null;
  }

  const alert = data as AdminAlert;

  try {
    const { sendAdminAlertEmail } = await import("@/lib/alerts/email");
    await sendAdminAlertEmail(alert);
  } catch (err) {
    console.error("Admin alert email failed:", err);
  }

  return alert;
}

export async function getUnacknowledgedAlerts(limit = 10): Promise<AdminAlert[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await admin
    .from("admin_alerts")
    .select("*")
    .is("acknowledged_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AdminAlert[];
}

export async function acknowledgeAdminAlert(id: string): Promise<boolean> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { error } = await admin
    .from("admin_alerts")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id)
    .is("acknowledged_at", null);

  return !error;
}

export async function getOrderAdminAlerts(orderId: string): Promise<AdminAlert[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data } = await admin
    .from("admin_alerts")
    .select("*")
    .eq("order_id", orderId)
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as AdminAlert[];
}
