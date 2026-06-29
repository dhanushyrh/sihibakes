import { BRAND } from "@/lib/constants";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { formatWhatsAppErrorForAdmin } from "@/lib/whatsapp/errors";

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
  error?: { message?: string; code?: number; error_subcode?: number };
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

export async function createWhatsAppTemplate(
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

/** Default templates aligned with lib/whatsapp/notifications.ts */
export function getSihiDefaultTemplates(): CreateWhatsAppTemplateInput[] {
  const footer = BRAND.name;

  return [
    {
      name: "order_confirmed",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Hi {{1}}, thank you for ordering from Sihi Bakes. Your order number {{2}} is confirmed. The total amount is {{3}}. Your delivery slot is {{4}}. We will update you when it is being prepared.",
          example: {
            body_text: [["Rahul", "SB-1001", "850 rupees", "30 Jun, 10 AM to 12 PM"]],
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
      name: "order_out_for_delivery_v2",
      language: "en_US",
      category: "UTILITY",
      allowCategoryChange: true,
      components: [
        {
          type: "BODY",
          text:
            "Good news from Sihi Bakes. Your order number {{1}} is now out for delivery. Delivery partner name is {{2}}. Delivery reference for this trip is {{3}}. Expected arrival window is {{4}}. Our team will contact you if anything changes.",
          example: {
            body_text: [["SB-1001", "Borzo", "REF-4821", "30 Jun, 11 AM to 1 PM"]],
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
          buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copy code" }],
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
}> {
  const existing = await listWhatsAppTemplates();
  const existingNames = new Set(
    (existing.templates ?? []).map((t) => t.name.toLowerCase())
  );

  const created: string[] = [];
  const skipped: string[] = [];
  const failed: { name: string; error: string }[] = [];

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
  };
}
