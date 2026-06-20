import { NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (!ids.length) return NextResponse.json([]);
  const products = await getProductsByIds(ids);
  return NextResponse.json(products);
}
