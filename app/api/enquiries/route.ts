import { NextResponse } from "next/server";
import { createEnquiry } from "@/lib/enquiries";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/mock-data";
import { notifyEnquiryReceived } from "@/lib/whatsapp/notifications";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Enquiries are not available right now" },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const result = await createEnquiry(admin, body);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    void notifyEnquiryReceived({
      enquiryId: result.id,
      name: result.name,
      phone: result.phone,
    });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (err) {
    console.error("Enquiry submit error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
