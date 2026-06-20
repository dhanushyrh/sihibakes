import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp-store";

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();
    if (!phone || !code) {
      return NextResponse.json({ error: "Phone and OTP required" }, { status: 400 });
    }

    const valid = verifyOtp(String(phone), String(code));
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
