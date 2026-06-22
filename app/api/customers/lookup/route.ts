import { NextResponse } from "next/server";
import { lookupCustomerCheckoutProfile } from "@/lib/customer-lookup";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = typeof body.phone === "string" ? body.phone : "";

    const result = await lookupCustomerCheckoutProfile(phone);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Customer lookup error:", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
