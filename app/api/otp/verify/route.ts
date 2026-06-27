import { NextResponse } from "next/server";
import {
  isLegalConsentSource,
  recordPhoneLegalAcknowledgement,
} from "@/lib/legal-consent";
import { isPhoneVerified, verifyOtp } from "@/lib/otp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { phone, code, accept_legal, source } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone required" }, { status: 400 });
    }

    if (!accept_legal) {
      return NextResponse.json(
        { error: "Please accept the Terms & Conditions and Privacy Policy" },
        { status: 400 }
      );
    }

    if (!isLegalConsentSource(source)) {
      return NextResponse.json({ error: "Invalid consent source" }, { status: 400 });
    }

    const normalizedPhone = String(phone);

    if (await isPhoneVerified(normalizedPhone)) {
      await recordPhoneLegalAcknowledgement(normalizedPhone, source, request);
      return NextResponse.json({ ok: true, already_verified: true });
    }

    if (!code) {
      return NextResponse.json({ error: "Phone and OTP required" }, { status: 400 });
    }

    const valid = await verifyOtp(normalizedPhone, String(code));
    if (!valid) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired OTP. Tap “Resend code” for a new one, or use the code shown above.",
        },
        { status: 400 }
      );
    }

    await recordPhoneLegalAcknowledgement(normalizedPhone, source, request);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
