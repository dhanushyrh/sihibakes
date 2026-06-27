import { NextResponse } from "next/server";
import { getProducts } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deliveryDate = searchParams.get("delivery_date") ?? undefined;
  const products = await getProducts(false, deliveryDate);
  return NextResponse.json(products);
}
