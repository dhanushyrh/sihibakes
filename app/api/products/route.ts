import { NextResponse } from "next/server";
import type { DeliveryMode } from "@/lib/customer-delivery-slots";
import { getProductsByIds } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  const deliveryDate = searchParams.get("delivery_date") ?? undefined;
  const deliveryMode = searchParams.get("delivery_mode") as DeliveryMode | null;
  if (!ids.length) return NextResponse.json([]);
  const products = await getProductsByIds(ids, deliveryDate, {
    deliveryMode,
    includeLowStockBadge: deliveryMode === "same_day",
  });
  return NextResponse.json(products);
}
