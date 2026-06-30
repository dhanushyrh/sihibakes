import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminNotificationItemType =
  | "order"
  | "enquiry"
  | "whatsapp"
  | "alert";

export type AdminNotificationItem = {
  id: string;
  type: AdminNotificationItemType;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  dismissible: boolean;
};

export type AdminNotificationFeed = {
  items: AdminNotificationItem[];
  totalCount: number;
};

const LIMIT = 10;

export async function getAdminNotificationFeed(
  admin: SupabaseClient
): Promise<AdminNotificationFeed> {
  const [
    { data: orders },
    { data: enquiries },
    { data: conversations },
    { data: alerts },
    { count: pendingOrderCount },
    { count: newEnquiryCount },
    { data: unreadRows },
    { count: alertCount },
  ] = await Promise.all([
    admin
      .from("orders")
      .select("id, order_number, customer_name, total_inr, created_at")
      .eq("status", "pending")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    admin
      .from("contact_enquiries")
      .select("id, name, type, phone, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    admin
      .from("whatsapp_conversations")
      .select(
        "id, display_name, phone, unread_count, last_message_preview, last_message_at, updated_at"
      )
      .gt("unread_count", 0)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(LIMIT),
    admin
      .from("admin_alerts")
      .select("id, title, message, severity, order_id, created_at")
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("payment_status", "paid"),
    admin
      .from("contact_enquiries")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    admin
      .from("whatsapp_conversations")
      .select("unread_count")
      .gt("unread_count", 0),
    admin
      .from("admin_alerts")
      .select("*", { count: "exact", head: true })
      .is("acknowledged_at", null),
  ]);

  const whatsappUnread = (unreadRows ?? []).reduce(
    (sum, row) => sum + (row.unread_count ?? 0),
    0
  );

  const items: AdminNotificationItem[] = [];

  for (const order of orders ?? []) {
    items.push({
      id: `order-${order.id}`,
      type: "order",
      title: `Order ${order.order_number}`,
      body: `${order.customer_name} — ₹${Number(order.total_inr).toLocaleString("en-IN")} awaiting confirmation`,
      href: `/admin/orders/${order.id}`,
      createdAt: order.created_at,
      dismissible: false,
    });
  }

  for (const enquiry of enquiries ?? []) {
    const typeLabel = String(enquiry.type ?? "general").replace(/_/g, " ");
    items.push({
      id: `enquiry-${enquiry.id}`,
      type: "enquiry",
      title: `New ${typeLabel} enquiry`,
      body: `${enquiry.name}${enquiry.phone ? ` · ${enquiry.phone}` : ""}`,
      href: `/admin/enquiries/${enquiry.id}`,
      createdAt: enquiry.created_at,
      dismissible: false,
    });
  }

  for (const conversation of conversations ?? []) {
    const name =
      conversation.display_name?.trim() || conversation.phone || "Customer";
    items.push({
      id: `whatsapp-${conversation.id}`,
      type: "whatsapp",
      title: `WhatsApp from ${name}`,
      body:
        conversation.last_message_preview?.trim() ||
        `${conversation.unread_count} unread message${conversation.unread_count === 1 ? "" : "s"}`,
      href: "/admin/whatsapp",
      createdAt:
        conversation.last_message_at ??
        conversation.updated_at ??
        new Date().toISOString(),
      dismissible: false,
    });
  }

  for (const alert of alerts ?? []) {
    items.push({
      id: `alert-${alert.id}`,
      type: "alert",
      title: alert.title,
      body: alert.message,
      href: alert.order_id
        ? `/admin/orders/${alert.order_id}`
        : "/admin",
      createdAt: alert.created_at,
      dismissible: true,
    });
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalCount =
    (pendingOrderCount ?? 0) +
    (newEnquiryCount ?? 0) +
    whatsappUnread +
    (alertCount ?? 0);

  return { items, totalCount };
}
