import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  countBlockingOrdersForDeliveryDate,
  formatBlockingOrdersError,
} from "@/lib/orders";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = new URL(request.url).searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  try {
    const blockingCount = await countBlockingOrdersForDeliveryDate(date);
    return NextResponse.json({
      canClose: blockingCount === 0,
      blockingCount,
      error:
        blockingCount > 0 ? formatBlockingOrdersError(blockingCount) : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not verify orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
