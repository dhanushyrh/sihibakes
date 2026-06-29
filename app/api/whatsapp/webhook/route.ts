import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { verifyMetaWebhookSignature } from "@/lib/whatsapp/signature";
import { processWhatsAppWebhook } from "@/lib/whatsapp/webhook-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = getWhatsAppConfig();
  const verifyToken = config?.verifyToken;
  if (!verifyToken) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const config = getWhatsAppConfig();
    const appSecret = config?.appSecret;
    if (!appSecret) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Parameters<
      typeof processWhatsAppWebhook
    >[1];
    const admin = createAdminClient();
    await processWhatsAppWebhook(admin, payload);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
