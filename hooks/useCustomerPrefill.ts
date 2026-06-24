"use client";

import { useEffect, useRef, useState } from "react";
import { isValidIndianPhone } from "@/lib/checkout-validation";
import type { CustomerCheckoutProfile } from "@/lib/customer-lookup";
import { prefillCustomerFromLookup } from "@/lib/customer-prefill";
import { useDeliverySession } from "@/components/store/DeliverySessionProvider";

export function useCustomerPrefill(phone: string, enabled = true) {
  const { session, setCustomer, setAddress, setLocation } = useDeliverySession();
  const [profile, setProfile] = useState<CustomerCheckoutProfile | null>(null);
  const [isFirstOrder, setIsFirstOrder] = useState(true);
  const [prefillNote, setPrefillNote] = useState("");
  const [ready, setReady] = useState(false);
  const lastLookupPhoneRef = useRef("");

  useEffect(() => {
    if (!enabled || !isValidIndianPhone(phone)) {
      setIsFirstOrder(true);
      setReady(false);
      setProfile(null);
      setPrefillNote("");
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (lastLookupPhoneRef.current === phone) {
            setReady(true);
            return;
          }

          const result = await prefillCustomerFromLookup(
            phone,
            {
              sessionLat: session.lat,
              sessionLng: session.lng,
              setCustomer,
              setAddress,
              setLocation,
            },
            controller.signal
          );

          if (controller.signal.aborted) return;

          lastLookupPhoneRef.current = phone;
          setProfile(result.profile);
          setIsFirstOrder(result.profile.is_first_order);
          setPrefillNote(result.prefillNote);
          setReady(true);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setReady(true);
        }
      })();
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    phone,
    enabled,
    session.lat,
    session.lng,
    setCustomer,
    setAddress,
    setLocation,
  ]);

  return { profile, isFirstOrder, prefillNote, ready };
}
