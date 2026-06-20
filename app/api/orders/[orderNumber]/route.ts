import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/storefront";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Phone required" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);
  const admin = createAdminClient();

  const [{ data: order }, { data: settings }] = await Promise.all([
    admin
      .from("orders")
      .select("*, order_items(*, products(*))")
      .eq("order_number", orderNumber)
      .eq("phone", normalizedPhone)
      .single(),
    admin.from("shop_settings").select("phone").limit(1).single(),
  ]);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...order,
    shop_phone: settings?.phone ?? null,
  });
}
