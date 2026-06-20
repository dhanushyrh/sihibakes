import { NextResponse } from "next/server";
import { getAvailableDeliverySlots } from "@/lib/data";

export async function GET() {
  const slots = await getAvailableDeliverySlots();
  return NextResponse.json(slots);
}
