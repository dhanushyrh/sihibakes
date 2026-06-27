import { NextResponse } from "next/server";
import { hasCurrentPhoneLegalAcknowledgement } from "@/lib/legal-consent";
import { isPhoneVerified } from "@/lib/otp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Valid phone required" }, { status: 400 });
    }

    const verified = await isPhoneVerified(phone);
    const consent = await hasCurrentPhoneLegalAcknowledgement(phone);

    return NextResponse.json({
      verified,
      consent,
      ready: verified && consent,
    });
  } catch (err) {
    console.error("OTP status error:", err);
    return NextResponse.json({ error: "Could not check status" }, { status: 500 });
  }
}
