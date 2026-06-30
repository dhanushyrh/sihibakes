"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { DeliveryLocationPicker } from "@/components/store/DeliveryLocationPicker";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";
import { isValidIndianPhone } from "@/lib/checkout-validation";
import { trackActivity } from "@/lib/activity-tracker";
import { CHECKOUT_DETAILS_PATH } from "@/lib/checkout-routing";
import type { DeliveryFenceKm } from "@/lib/types";
import { OrderFlowLoading } from "@/components/store/OrderFlowLoading";

export function DeliveryCheckoutLocationClient({
  storeOpen,
  kitchenLat,
  kitchenLng,
  deliveryFence,
}: {
  storeOpen: boolean;
  kitchenLat: number;
  kitchenLng: number;
  deliveryFence: DeliveryFenceKm;
}) {
  const router = useRouter();
  const { session, sessionReady, isLocationReady, setLocation } =
    useDeliverySession();
  const locationTrackedRef = useRef(false);

  useEffect(() => {
    if (!isLocationReady || locationTrackedRef.current) return;
    if (session.lat == null || session.lng == null || !session.delivery) return;

    locationTrackedRef.current = true;
    trackActivity("location_marked", "location", {
      lat: session.lat,
      lng: session.lng,
      deliveryDistanceKm: session.delivery.distance_km,
      deliveryFeeInr: session.delivery.delivery_fee_inr,
      phone: session.whatsappPhone,
    });
  }, [
    isLocationReady,
    session.lat,
    session.lng,
    session.delivery,
    session.whatsappPhone,
  ]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!session.phoneVerified || !isValidIndianPhone(session.whatsappPhone)) {
      router.replace("/orders/delivery/cart?auth=1");
    }
  }, [sessionReady, session.phoneVerified, session.whatsappPhone, router]);

  if (!sessionReady) {
    return <OrderFlowLoading />;
  }

  if (!storeOpen) {
    return (
      <div className="flex min-h-screen flex-col">
        <OrderFlowHeader title="Delivery location" backHref="/orders/delivery/cart" />
        <main className="flex flex-1 items-center justify-center p-6 text-center text-sm text-chocolate/60">
          Store is closed. Please try again later.
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <OrderFlowHeader title="Delivery location" backHref="/orders/delivery/cart" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-chocolate">
              Almost there — where should we deliver?
            </h2>
            <p className="mt-1 text-sm text-chocolate/60">
              Search for your area, or use the buttons below to set your pin.
            </p>
          </div>

          <section className="overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-chocolate/10">
            <DeliveryLocationPicker
              variant="gate"
              kitchenLat={kitchenLat}
              kitchenLng={kitchenLng}
              deliveryFence={deliveryFence}
              initialLat={session.lat ?? kitchenLat}
              initialLng={session.lng ?? kitchenLng}
              hasSavedLocation={session.lat != null && session.lng != null}
              skipInitialCalculate={session.delivery != null}
              initialDelivery={session.delivery}
              useGeolocationInitially={false}
              onUpdate={(lat, lng, delivery) => setLocation(lat, lng, delivery)}
              onUnreachableExit={() => router.push("/orders/delivery/menu")}
            />
          </section>

          {isLocationReady && (
            <button
              type="button"
              onClick={() => router.push(CHECKOUT_DETAILS_PATH)}
              className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream"
            >
              Continue
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
