import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildOrderRosterExport } from "@/lib/order-roster-csv";
import type { RosterGroupMode, RosterOrder } from "@/lib/order-roster";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: string | null, label: string) {
  if (!value || !DATE_RE.test(value)) {
    return { error: `Invalid ${label}. Use YYYY-MM-DD.` };
  }
  return { value };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const modeParam = searchParams.get("mode");
  const mode: RosterGroupMode = modeParam === "day" ? "day" : "slot";

  const startParsed = parseDateParam(searchParams.get("date"), "date");
  if ("error" in startParsed) {
    return NextResponse.json({ error: startParsed.error }, { status: 400 });
  }

  const endParam = searchParams.get("endDate");
  const endParsed = endParam
    ? parseDateParam(endParam, "endDate")
    : { value: startParsed.value };
  if ("error" in endParsed) {
    return NextResponse.json({ error: endParsed.error }, { status: 400 });
  }

  const startDate = startParsed.value;
  const endDate = endParsed.value;

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "Start date must be on or before end date." },
      { status: 400 }
    );
  }

  if (mode === "slot" && endParam && startDate !== endDate) {
    return NextResponse.json(
      { error: "Time-slot export supports a single delivery date." },
      { status: 400 }
    );
  }

  const windowStart = searchParams.get("windowStart")?.trim();
  const windowEnd = searchParams.get("windowEnd")?.trim();
  const dayFilter = searchParams.get("day")?.trim();

  if ((windowStart && !windowEnd) || (!windowStart && windowEnd)) {
    return NextResponse.json(
      { error: "Both windowStart and windowEnd are required for slot export." },
      { status: 400 }
    );
  }

  if (windowStart && mode !== "slot") {
    return NextResponse.json(
      { error: "Slot filter is only supported in slot mode." },
      { status: 400 }
    );
  }

  if (dayFilter) {
    if (!DATE_RE.test(dayFilter)) {
      return NextResponse.json(
        { error: "Invalid day. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
    if (dayFilter < startDate || dayFilter > endDate) {
      return NextResponse.json(
        { error: "Day filter must fall within the selected date range." },
        { status: 400 }
      );
    }
  }

  const admin = createAdminClient();
  const queryStart = dayFilter ?? startDate;
  const queryEnd = dayFilter ?? endDate;

  const { data, error } = await admin
    .from("orders")
    .select("*, order_items(*, products(title))")
    .eq("payment_status", "paid")
    .neq("status", "cancelled")
    .gte("delivery_date", queryStart)
    .lte("delivery_date", queryEnd)
    .order("delivery_date", { ascending: true })
    .order("delivery_window_start", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load orders for export." },
      { status: 500 }
    );
  }

  const orders = (data ?? []) as RosterOrder[];
  const exportResult = buildOrderRosterExport(
    orders,
    mode,
    startDate,
    endDate,
    {
      ...(windowStart && windowEnd
        ? { slotFilter: { windowStart, windowEnd } }
        : {}),
      ...(dayFilter ? { dayFilter } : {}),
    }
  );

  return new NextResponse(Buffer.from(exportResult.body), {
    headers: {
      "Content-Type": exportResult.contentType,
      "Content-Disposition": `attachment; filename="${exportResult.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
