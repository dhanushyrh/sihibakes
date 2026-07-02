import { NextResponse } from "next/server";
import { createOtp, isPhoneVerified, OtpResendCooldownError } from "@/lib/otp-store";
import {
  isPhoneOtpDemoMode,
  isWhatsAppConfigured,
  isWhatsAppNotificationsEnabled,
} from "@/lib/whatsapp/config";
import { sendCheckoutOtp } from "@/lib/whatsapp/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV !== "production";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Valid phone required" }, { status: 400 });
    }

    const normalizedPhone = String(phone);
    const demoMode = await isPhoneOtpDemoMode();

    if (await isPhoneVerified(normalizedPhone)) {
      return NextResponse.json({
        ok: true,
        already_verified: true,
        demo_mode: demoMode,
        whatsapp_sent: false,
        message: "Phone number already verified",
      });
    }

    let code: string;

    try {
      code = await createOtp(normalizedPhone);
    } catch (err) {
      if (err instanceof OtpResendCooldownError) {
        return NextResponse.json(
          { error: "Please wait a minute before requesting another code" },
          { status: 429 }
        );
      }
      throw err;
    }

    const whatsappConfigured = isWhatsAppConfigured();
    const notificationsEnabled = await isWhatsAppNotificationsEnabled();
    let whatsappSent = false;

    if (whatsappConfigured && notificationsEnabled) {
      const result = await sendCheckoutOtp(normalizedPhone, code);
      whatsappSent = result.ok;
      if (!result.ok) {
        console.warn("WhatsApp reach_confirmation send failed:", result.error);
      }
    }

    const showOnScreenFallback =
      demoMode || !whatsappSent || !whatsappConfigured || !notificationsEnabled;

    return NextResponse.json({
      ok: true,
      demo_mode: showOnScreenFallback,
      whatsapp_sent: whatsappSent,
      message: whatsappSent
        ? "Check WhatsApp — we sent your verification id there"
        : showOnScreenFallback
          ? isDev
            ? "Enter the verification code shown below"
            : "Could not deliver via WhatsApp — tap Resend or contact support"
          : "Could not deliver via WhatsApp — try again or contact support",
      ...(showOnScreenFallback && isDev ? { debug_otp: code } : {}),
    });
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json({ error: "Could not send verification code" }, { status: 500 });
  }
}
