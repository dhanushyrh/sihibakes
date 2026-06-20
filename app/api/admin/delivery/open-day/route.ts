import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openDeliveryDay } from "@/lib/shop-closed-days";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const date = body?.date as string | undefined;
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  try {
    await openDeliveryDay(date);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to open day";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
