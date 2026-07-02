import { NextResponse } from "next/server";
import { getProducts } from "@/lib/data";
import type { DeliveryMode } from "@/lib/customer-delivery-slots";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deliveryDate = searchParams.get("delivery_date") ?? undefined;
  const deliveryMode = searchParams.get("delivery_mode") as DeliveryMode | null;
  const products = await getProducts(false, deliveryDate, {
    includeLowStockBadge: deliveryMode === "same_day",
  });
  return NextResponse.json(products);
}
