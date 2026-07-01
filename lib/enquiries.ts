import type { SupabaseClient } from "@supabase/supabase-js";
import { ENQUIRIES_PAGE_SIZE } from "@/lib/constants";
import { isValidIndianPhone, normalizeIndianPhone } from "@/lib/checkout-validation";
import { requireVerifiedPhoneWithConsent } from "@/lib/legal-consent";
import { notifyEnquiryReceived } from "@/lib/whatsapp/notifications";
import type { ContactEnquiry, EnquiryStatus, EnquiryType } from "@/lib/types";

export type EnquirySubmitBody = {
  type: EnquiryType;
  name: string;
  phone: string;
  message: string;
  event_date?: string;
  event_time?: string;
  items?: { product_id: string; quantity: number }[];
};

export function enquiryShortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function validateEnquiryBody(body: EnquirySubmitBody): string | null {
  const name = String(body.name ?? "").trim();
  const phone = normalizeIndianPhone(String(body.phone ?? ""));
  const message = String(body.message ?? "").trim();
  const type = body.type;

  if (!["kitty_party", "general", "landing"].includes(type)) {
    return "Invalid enquiry type";
  }
  if (name.length < 2) return "Please enter your name";
  if (!isValidIndianPhone(phone)) return "Please enter a valid 10-digit WhatsApp number";

  if (type === "kitty_party") {
    if (!body.event_date) return "Please select an event date";
    if (!body.items?.length) return "Please select at least one product";
    for (const item of body.items) {
      if (!item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return "Invalid product selection";
      }
    }
    return null;
  }

  if (message.length < 10) {
    return "Please enter a message (at least 10 characters)";
  }

  return null;
}

export async function createEnquiry(
  admin: SupabaseClient,
  body: EnquirySubmitBody
): Promise<{ id: string } | { error: string; status: number }> {
  const validationError = validateEnquiryBody(body);
  if (validationError) {
    return { error: validationError, status: 400 };
  }

  const name = String(body.name).trim();
  const phone = normalizeIndianPhone(String(body.phone));
  const message = String(body.message ?? "").trim();
  const type = body.type;

  const phoneGuard = await requireVerifiedPhoneWithConsent(phone);
  if (!phoneGuard.ok) {
    return { error: phoneGuard.error, status: phoneGuard.status };
  }

  let productRows: { product_id: string; product_name: string; quantity: number }[] = [];

  if (type === "kitty_party" && body.items?.length) {
    const productIds = body.items.map((i) => i.product_id);
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, title, is_active")
      .in("id", productIds);

    if (productsError) {
      return { error: "Could not validate products", status: 500 };
    }

    const productMap = new Map((products ?? []).map((p) => [p.id, p]));

    for (const item of body.items) {
      const product = productMap.get(item.product_id);
      if (!product || !product.is_active) {
        return { error: "One or more selected products are unavailable", status: 400 };
      }
      productRows.push({
        product_id: item.product_id,
        product_name: product.title,
        quantity: item.quantity,
      });
    }
  }

  const source =
    type === "landing" ? "landing" : type === "kitty_party" ? "kitty_party" : "orders";

  const { data: enquiry, error: insertError } = await admin
    .from("contact_enquiries")
    .insert({
      name,
      phone,
      email: null,
      message: type === "kitty_party" ? message || "Kitty party enquiry" : message,
      source,
      type,
      status: "new",
      event_date: type === "kitty_party" ? body.event_date : null,
      event_time: type === "kitty_party" ? body.event_time : null,
      phone_verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !enquiry) {
    console.error("Enquiry insert failed:", insertError);
    return { error: "Could not submit enquiry", status: 500 };
  }

  if (productRows.length > 0) {
    const { error: itemsError } = await admin.from("enquiry_items").insert(
      productRows.map((row) => ({
        enquiry_id: enquiry.id,
        product_id: row.product_id,
        product_name: row.product_name,
        quantity: row.quantity,
      }))
    );

    if (itemsError) {
      console.error("Enquiry items insert failed:", itemsError);
      await admin.from("contact_enquiries").delete().eq("id", enquiry.id);
      return { error: "Could not submit enquiry", status: 500 };
    }
  }

  void notifyEnquiryReceived({ enquiryId: enquiry.id, name, phone });

  return { id: enquiry.id };
}

export type AdminEnquiriesQueryParams = {
  page?: number;
  pageSize?: number;
  type?: EnquiryType | "all";
  status?: EnquiryStatus[];
  unread?: boolean;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function parseAdminEnquiriesQueryParams(
  searchParams: URLSearchParams
): AdminEnquiriesQueryParams {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(ENQUIRIES_PAGE_SIZE), 10) || ENQUIRIES_PAGE_SIZE)
  );
  const typeParam = searchParams.get("type");
  const type =
    typeParam && ["kitty_party", "general", "landing", "all"].includes(typeParam)
      ? (typeParam as EnquiryType | "all")
      : "all";
  const statusParam = searchParams.get("status");
  const status = statusParam
    ? (statusParam.split(",").filter((s) =>
        ["new", "in_progress", "replied", "closed"].includes(s)
      ) as EnquiryStatus[])
    : [];
  const q = searchParams.get("q")?.trim() || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const unread =
    searchParams.get("unread") === "1" ||
    searchParams.get("unread") === "true";

  return { page, pageSize, type, status, unread, q, dateFrom, dateTo };
}

export async function queryAdminEnquiries(
  admin: SupabaseClient,
  params: AdminEnquiriesQueryParams
): Promise<{ data: ContactEnquiry[] | null; count: number | null; error: Error | null }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? ENQUIRIES_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("contact_enquiries")
    .select("*, enquiry_items(*)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type);
  }
  if (params.status?.length) {
    query = query.in("status", params.status);
  }
  if (params.unread) {
    query = query.is("read_at", null);
  }
  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`name.ilike.${term},phone.ilike.${term}`);
  }
  if (params.dateFrom) {
    query = query.gte("created_at", `${params.dateFrom}T00:00:00`);
  }
  if (params.dateTo) {
    query = query.lte("created_at", `${params.dateTo}T23:59:59`);
  }

  const { data, count, error } = await query.range(from, to);

  return {
    data: data as ContactEnquiry[] | null,
    count,
    error: error ? new Error(error.message) : null,
  };
}

export async function getUnreadEnquiryCount(
  admin: SupabaseClient
): Promise<number> {
  const { count, error } = await admin
    .from("contact_enquiries")
    .select("*", { count: "exact", head: true })
    .is("read_at", null);

  if (error) {
    console.error("Unread enquiry count failed:", error);
    return 0;
  }

  return count ?? 0;
}

export async function markEnquiryRead(
  admin: SupabaseClient,
  id: string
): Promise<ContactEnquiry | null> {
  const { data, error } = await admin
    .from("contact_enquiries")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null)
    .select("*, enquiry_items(*)")
    .maybeSingle();

  if (error) {
    console.error("Mark enquiry read failed:", error);
    return null;
  }

  if (data) return data as ContactEnquiry;

  const { data: existing } = await admin
    .from("contact_enquiries")
    .select("*, enquiry_items(*)")
    .eq("id", id)
    .maybeSingle();

  return (existing as ContactEnquiry | null) ?? null;
}

export function formatEnquirySummary(enquiry: ContactEnquiry): string {
  if (enquiry.type === "kitty_party") {
    const itemCount = enquiry.enquiry_items?.length ?? 0;
    const parts: string[] = [];
    if (itemCount > 0) parts.push(`${itemCount} item${itemCount === 1 ? "" : "s"}`);
    if (enquiry.event_date) {
      const date = new Date(`${enquiry.event_date}T12:00:00`);
      parts.push(
        date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      );
    }
    if (enquiry.event_time) {
      const [h, m] = enquiry.event_time.split(":");
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      parts.push(`${h12}:${m} ${ampm}`);
    }
    return parts.join(" · ") || enquiry.message.slice(0, 60);
  }
  return enquiry.message.length > 60
    ? `${enquiry.message.slice(0, 60)}…`
    : enquiry.message;
}
