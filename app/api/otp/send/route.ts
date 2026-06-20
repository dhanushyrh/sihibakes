import { NextResponse } from "next/server";
import { createOtp } from "@/lib/otp-store";

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Valid phone required" }, { status: 400 });
    }

    const code = createOtp(String(phone));

    return NextResponse.json({
      ok: true,
      message: "OTP sent",
      ...(process.env.NODE_ENV !== "production" ? { debug_otp: code } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Could not send OTP" }, { status: 500 });
  }
}
