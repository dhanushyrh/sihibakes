import { NextResponse } from "next/server";
import { isPhoneVerified, verifyOtp } from "@/lib/otp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();
    if (!phone || !code) {
      return NextResponse.json({ error: "Phone and OTP required" }, { status: 400 });
    }

    const normalizedPhone = String(phone);

    if (await isPhoneVerified(normalizedPhone)) {
      return NextResponse.json({ ok: true, already_verified: true });
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
