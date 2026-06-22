import { NextResponse } from "next/server";
import { getActivePublicCoupons } from "@/lib/public-coupons";

export async function GET() {
  try {
    const coupons = await getActivePublicCoupons();
    return NextResponse.json(coupons);
  } catch {
    return NextResponse.json({ error: "Could not load coupons" }, { status: 500 });
  }
}
