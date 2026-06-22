import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/mock-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = body.email ? String(body.email).trim() : null;
    const message = String(body.message ?? "").trim();

    if (name.length < 2) {
      return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
    }
    if (phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Please enter a valid phone" }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json(
        { error: "Please enter a message (at least 10 characters)" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const { error } = await admin.from("contact_enquiries").insert({
        name,
        phone,
        email,
        message,
        source: "landing",
        type: "landing",
        status: "new",
      });
      if (error) {
        console.error("Contact enquiry insert failed:", error);
        return NextResponse.json(
          { error: "Could not send message. Please try calling us." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
