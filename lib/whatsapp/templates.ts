import { BRAND } from "@/lib/constants";
import { getGoogleReviewUrl, getWhatsAppConfig } from "@/lib/whatsapp/config";
import { formatWhatsAppErrorForAdmin } from "@/lib/whatsapp/errors";
import { WHATSAPP_ORDER_REVIEW_REQUEST_TEMPLATE } from "@/lib/whatsapp/template-registry";

export type WhatsAppTemplateCategory =
  | "AUTHENTICATION"
  | "MARKETING"
  | "UTILITY";

export type WhatsAppTemplateComponent = Record<string, unknown>;

export type CreateWhatsAppTemplateInput = {
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  components: WhatsAppTemplateComponent[];
  allowCategoryChange?: boolean;
};

export type WhatsAppTemplateSummary = {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: WhatsAppTemplateComponent[];
};

type GraphListResponse = {
  data?: WhatsAppTemplateSummary[];
  paging?: { next?: string };
  error?: { message?: string; code?: number };
};

type GraphCreateResponse = {
  id?: string;
  status?: string;
  category?: string;
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    error_user_msg?: string;
  };
};

type GraphUpsertResponse = {
  data?: { id?: string; status?: string }[];
  error?: GraphCreateResponse["error"];
};

export function isWhatsAppTemplateManagementConfigured(): boolean {
  const config = getWhatsAppConfig();
  return Boolean(config?.accessToken && config.businessAccountId);
}

function graphBaseUrl(): { url: string; token: string; wabaId: string } | null {
  const config = getWhatsAppConfig();
  if (!config?.accessToken || !config.businessAccountId) return null;
  return {
    url: `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}`,
    token: config.accessToken,
    wabaId: config.businessAccountId,
  };
}

export async function listWhatsAppTemplates(params?: {
  limit?: number;
  status?: string;
}): Promise<{
  ok: boolean;
  templates: WhatsAppTemplateSummary[];
  error: string | null;
}> {
  const base = graphBaseUrl();
  if (!base) {
    return {
      ok: false,
      templates: [],
      error: "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_WABA_ID for template management.",
    };
  }

  const search = new URLSearchParams({
    fields: "id,name,status,category,language,components",
    limit: String(params?.limit ?? 100),
  });
  if (params?.status) search.set("status", params.status);

  try {
    const res = await fetch(`${base.url}/message_templates?${search}`, {
      headers: { Authorization: `Bearer ${base.token}` },
      cache: "no-store",
    });
    const data = (await res.json()) as GraphListResponse;

    if (!res.ok) {
      return {
        ok: false,
        templates: [],
        error: formatWhatsAppErrorForAdmin(data.error) || `Meta API error (${res.status})`,
      };
    }

    return { ok: true, templates: data.data ?? [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list templates";
    return { ok: false, templates: [], error: message };
  }
}

export async function createAuthenticationWhatsAppTemplate(
  input: CreateWhatsAppTemplateInput
): Promise<{
  ok: boolean;
  id: string | null;
  status: string | null;
  error: string | null;
}> {
  const base = graphBaseUrl();
  if (!base) {
    return {
      ok: false,
      id: null,
      status: null,
      error: "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_WABA_ID for template management.",
    };
  }

  const name = input.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (!name) {
    return { ok: false, id: null, status: null, error: "Invalid template name" };
  }

  // Authentication templates must use upsert_message_templates (not message_templates).
  const body = {
    name,
    languages: [input.language],
    category: "AUTHENTICATION" as const,
    components: input.components,
  };

  try {
    const res = await fetch(`${base.url}/upsert_message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${base.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as GraphUpsertResponse;

    if (!res.ok) {
      return {
        ok: false,
        id: null,
        status: null,
        error: formatWhatsAppErrorForAdmin(data.error) || `Meta API error (${res.status})`,
      };
    }

    const created = data.data?.[0];
    return {
      ok: true,
      id: created?.id ?? null,
      status: created?.status ?? "PENDING",
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create authentication template";
    return { ok: false, id: null, status: null, error: message };
  }
}

export async function createWhatsAppTemplate(
  input: CreateWhatsAppTemplateInput
): Promise<{
  ok: boolean;
  id: string | null;
  status: string | null;
  error: string | null;
}> {
  if (input.category === "AUTHENTICATION") {
    return createAuthenticationWhatsAppTemplate(input);
  }

  const base = graphBaseUrl();
  if (!base) {
    return {
      ok: false,
      id: null,
      status: null,
      error: "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_WABA_ID for template management.",
    };
  }

  const name = input.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (!name) {
    return { ok: false, id: null, status: null, error: "Invalid template name" };
  }

  const body = {
    name,
    language: input.language,
    category: input.category,
    components: input.components,
    ...(input.allowCategoryChange ? { allow_category_change: true } : {}),
  };

  try {
    const res = await fetch(`${base.url}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${base.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as GraphCreateResponse;

    if (!res.ok) {
      return {
        ok: false,
        id: null,
        status: null,
        error: formatWhatsAppErrorForAdmin(data.error) || `Meta API error (${res.status})`,
      };
    }

    return {
      ok: true,
      id: data.id ?? null,
      status: data.status ?? "PENDING",
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create template";
    return { ok: false, id: null, status: null, error: message };
  }
}

/** Default templates aligned with live notifications (no legacy duplicates). */
export function getSihiDefaultTemplates(): CreateWhatsAppTemplateInput[] {
  const footer = BRAND.name;
  const googleReviewUrl = getGoogleReviewUrl();

  return [
    {
      name: "order_confirmed_v2",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "🎉 Order Confirmed!\n\nHi {{1}},\n\nThank you for ordering from Sihi Bakes! 💛\n\nYour order {{2}} has been confirmed.\n\nTotal: {{3}}\nDelivery Slot: {{4}}\n\nWe'll notify you as soon as your order starts being prepared.",
          example: {
            body_text: [
              ["Dhanush", "SIHI-20260701-2550", "₹299", "4 Jul, 6:00 PM – 8:00 PM"],
            ],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: "order_preparing",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Sihi Bakes Update. Your order {{1}} is now Preparing. Our kitchen has started preparing your order with care. We will notify you again once it is ready for pickup or out for delivery. Thank you for your patience.",
          example: {
            body_text: [["SIHI-20260701-2550"]],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: "order_delivered",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Sihi Bakes Update\n\nYour order {{1}} has been delivered.\n\nWe hope you enjoy every bite! 💛 Thank you for choosing Sihi Bakes. We'd love to hear your feedback.",
          example: {
            body_text: [["SIHI-20260701-2550"]],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: "order_status_update",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Quick update from Sihi Bakes for order {{1}}. Current status: {{2}}. Note from our team: {{3}}. Thank you for your patience.",
          example: {
            body_text: [
              ["SB-1001", "Preparing", "Your order is being prepared in our kitchen."],
            ],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: "order_self_on_the_way_v2",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Your Sihi Bakes order {{1}} is on its way!\n\nOur team is delivering your order directly to you.\n\nETA: {{2}}\n\nThank you! 💛",
          example: {
            body_text: [["SIHI-20260701-2550", "4 Jul, 6:00–8:00 PM"]],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: "order_on_the_way_v2",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Your Sihi Bakes order {{1}} is on its way!\n\nDelivery Partner: {{2}}\nref code: {{3}}\nETA: {{4}}\n\nThank you! 💛",
          example: {
            body_text: [
              ["SIHI-20260701-2550", "Test Rider", "9997", "4 Jul, 6:00–8:00 PM"],
            ],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: "order_cancelled",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "We are sorry, but your Sihi Bakes order {{1}} has been cancelled. Reason shared by our team: {{2}}. Please contact us if you need help.",
          example: {
            body_text: [["SB-1001", "Item unavailable"]],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: "enquiry_received",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Hi {{1}}, thank you for your enquiry at Sihi Bakes. Your reference is {{2}}. Our team will get back to you shortly.",
          example: {
            body_text: [["Rahul", "A1B2C3D4"]],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: "new_order_received",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Sihi Bakes — new paid order alert. Customer name: {{1}}. Order items: {{2}}. Delivery date and slot: {{3}}. Please open the admin panel to review and confirm this order.",
          example: {
            body_text: [
              [
                "Rahul Sharma",
                "2× Tiramisu, 1× Brownie",
                "4 Jul, 6:00 PM – 8:00 PM",
              ],
            ],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: "reach_confirmation",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Thanks for reaching out Sihi Bakes, your id is {{1}}. Please reach out for more support at {{2}} if needed.",
          example: {
            body_text: [["SIHI-847291", "+91 8310923990"]],
          },
        },
        { type: "FOOTER", text: footer },
      ],
    },
    {
      name: WHATSAPP_ORDER_REVIEW_REQUEST_TEMPLATE,
      language: "en_US",
      category: "MARKETING",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Hi {{1}}, thank you for ordering from Sihi Bakes! 💛\n\nIf you enjoyed your treats, we'd love a quick Google review — it helps more people in Mangaluru discover us.\n\nTap below to leave a review.",
          example: {
            body_text: [["Dhanush"]],
          },
        },
        { type: "FOOTER", text: footer },
        {
          type: "BUTTONS",
          buttons: [
            {
              type: "URL",
              text: "Leave a review",
              url: googleReviewUrl,
            },
          ],
        },
      ],
    },
    // AUTHENTICATION OTP — may fail to create until WABA is TIER_2K+
    {
      name: "checkout_otp",
      language: "en",
      category: "AUTHENTICATION",
      components: [
        {
          type: "BODY",
          add_security_recommendation: true,
        },
        {
          type: "FOOTER",
          code_expiration_minutes: 10,
        },
        {
          type: "BUTTONS",
          buttons: [{ type: "OTP", otp_type: "COPY_CODE" }],
        },
      ],
    },
  ];
}

export async function seedSihiDefaultTemplates(): Promise<{
  ok: boolean;
  created: string[];
  skipped: string[];
  failed: { name: string; error: string }[];
  notes: string[];
}> {
  const existing = await listWhatsAppTemplates();
  const existingNames = new Set(
    (existing.templates ?? []).map((t) => t.name.toLowerCase())
  );

  const created: string[] = [];
  const skipped: string[] = [];
  const failed: { name: string; error: string }[] = [];
  const notes: string[] = [];

  for (const template of getSihiDefaultTemplates()) {
    if (existingNames.has(template.name)) {
      skipped.push(template.name);
      continue;
    }

    const result = await createWhatsAppTemplate(template);
    if (result.ok) {
      created.push(template.name);
      existingNames.add(template.name);
    } else {
      failed.push({ name: template.name, error: result.error ?? "Unknown error" });
    }
  }

  return {
    ok: failed.length === 0,
    created,
    skipped,
    failed,
    notes,
  };
}
