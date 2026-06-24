import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  acknowledgeAdminAlert,
  getUnacknowledgedAlerts,
} from "@/lib/alerts/notify-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const alerts = await getUnacknowledgedAlerts(20);
  return NextResponse.json(alerts);
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = (await request.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Alert id required" }, { status: 400 });
  }

  const ok = await acknowledgeAdminAlert(id);
  if (!ok) {
    return NextResponse.json({ error: "Could not acknowledge alert" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
