import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseOrderInventory } from "@/lib/inventory-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const phone = String(body.phone ?? "")
      .replace(/\D/g, "")
      .slice(-10);

    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id, phone, payment_status, inventory_hold_status")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.phone !== phone) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (order.payment_status !== "pending") {
      return NextResponse.json({ released: true });
    }

    if (order.inventory_hold_status !== "held") {
      return NextResponse.json({ released: true });
    }

    const result = await releaseOrderInventory(orderId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Could not release stock" },
        { status: 500 }
      );
    }

    return NextResponse.json({ released: true });
  } catch (err) {
    console.error("Release inventory error:", err);
    return NextResponse.json({ error: "Release failed" }, { status: 500 });
  }
}
