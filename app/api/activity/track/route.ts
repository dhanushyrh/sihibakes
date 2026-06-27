import { NextResponse } from "next/server";
import {
  ACTIVITY_EVENTS,
  ACTIVITY_STAGES,
  normalizeActivityCartItems,
  trackActivityEvent,
  type ActivityEventName,
  type ActivityStage,
} from "@/lib/customer-activity";
import { parseRequestClientInfo } from "@/lib/request-client-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLIENT_ALLOWED_EVENTS: ActivityEventName[] = [
  "cart_item_added",
  "phone_verified",
  "location_marked",
  "checkout_started",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      anonymousId,
      eventName,
      stage,
      phone,
      fullName,
      email,
      lat,
      lng,
      deliveryDistanceKm,
      deliveryFeeInr,
      cartValueInr,
      cartItems,
      payload,
    } = body;

    if (!anonymousId || typeof anonymousId !== "string") {
      return NextResponse.json({ error: "Missing anonymousId" }, { status: 400 });
    }

    if (
      !ACTIVITY_EVENTS.includes(eventName) ||
      !CLIENT_ALLOWED_EVENTS.includes(eventName)
    ) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    if (!ACTIVITY_STAGES.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }

    const normalizedPhone =
      typeof phone === "string"
        ? phone.replace(/\D/g, "").slice(-10) || null
        : null;

    const clientInfo = parseRequestClientInfo(request);
    const normalizedCartItems = normalizeActivityCartItems(
      cartItems ?? (typeof payload === "object" && payload ? payload.cartItems : null)
    );

    const result = await trackActivityEvent({
      sessionId: typeof sessionId === "string" ? sessionId : null,
      anonymousId,
      eventName: eventName as ActivityEventName,
      stage: stage as ActivityStage,
      phone: normalizedPhone,
      fullName: typeof fullName === "string" ? fullName : null,
      email: typeof email === "string" ? email : null,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      deliveryDistanceKm:
        typeof deliveryDistanceKm === "number" ? deliveryDistanceKm : null,
      deliveryFeeInr:
        typeof deliveryFeeInr === "number" ? deliveryFeeInr : null,
      cartValueInr: typeof cartValueInr === "number" ? cartValueInr : null,
      cartItems: normalizedCartItems.length > 0 ? normalizedCartItems : null,
      clientInfo,
      payload: typeof payload === "object" && payload ? payload : {},
    });

    if (!result) {
      return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sessionId: result.sessionId });
  } catch (err) {
    console.error("Activity track error:", err);
    return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
  }
}
