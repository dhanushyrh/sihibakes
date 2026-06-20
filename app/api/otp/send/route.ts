import { NextResponse } from "next/server";
import { createOtp, OtpResendCooldownError } from "@/lib/otp-store";
import { isWhatsAppConfigured } from "@/lib/whatsapp/config";
import { sendCheckoutOtp } from "@/lib/whatsapp/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Valid phone required" }, { status: 400 });
    }

    const normalizedPhone = String(phone);
    let code: string;

    try {
      code = await createOtp(normalizedPhone);
    } catch (err) {
      if (err instanceof OtpResendCooldownError) {
        return NextResponse.json(
          { error: "Please wait a minute before requesting another OTP" },
          { status: 429 }
        );
      }
      throw err;
    }

    const whatsappConfigured = isWhatsAppConfigured();
    let whatsappSent = false;

    if (whatsappConfigured) {
      const result = await sendCheckoutOtp(normalizedPhone, code);
      whatsappSent = result.ok;
      if (!result.ok) {
        console.warn("WhatsApp OTP send failed:", result.error);
      }
    }

    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      ok: true,
      message: whatsappSent
        ? "OTP sent to your WhatsApp number"
        : whatsappConfigured
          ? "OTP generated but WhatsApp delivery failed — try again or contact support"
          : isDev
            ? "OTP generated (WhatsApp not configured in dev)"
            : "OTP sent to your WhatsApp number",
      ...(isDev && !whatsappSent ? { debug_otp: code } : {}),
    });
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json({ error: "Could not send OTP" }, { status: 500 });
  }
}
