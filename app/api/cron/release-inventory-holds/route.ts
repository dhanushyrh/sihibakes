import { NextResponse } from "next/server";
import { releaseExpiredInventoryHolds } from "@/lib/inventory-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const released = await releaseExpiredInventoryHolds();
  return NextResponse.json({ released });
}
