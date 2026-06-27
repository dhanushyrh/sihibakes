"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DeliveryCalculation } from "@/lib/types";
import {
  EMPTY_DELIVERY_SESSION,
  readDeliverySession,
  writeDeliverySession,
  clearDeliverySession as clearStoredSession,
  type DeliverySession,
  isDeliveryLocationReady,
  isDeliveryModeReady,
} from "@/lib/delivery-session";
import type { DeliveryMode } from "@/lib/customer-delivery-slots";

type DeliverySessionContextValue = {
  session: DeliverySession;
  sessionReady: boolean;
  isLocationReady: boolean;
  isDeliveryModeReady: boolean;
  setLocation: (lat: number, lng: number, delivery: DeliveryCalculation | null) => void;
  setDeliverySchedule: (mode: DeliveryMode, date: string) => void;
  setAddress: (fields: Partial<Pick<DeliverySession, "house" | "street" | "landmark" | "pincode">>) => void;
  setCustomer: (
    fields: Partial<
      Pick<DeliverySession, "customerName" | "email" | "whatsappPhone" | "altPhone">
    >
  ) => void;
  setPhoneVerified: (verified: boolean) => void;
  setVerifiedPhone: (phone: string) => void;
  clearSession: () => void;
};

const DeliverySessionContext = createContext<DeliverySessionContextValue | null>(
  null
);

export function DeliverySessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<DeliverySession>(EMPTY_DELIVERY_SESSION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(readDeliverySession());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeDeliverySession(session);
  }, [session, hydrated]);

  const setLocation = useCallback(
    (lat: number, lng: number, delivery: DeliveryCalculation | null) => {
      setSession((prev) => ({ ...prev, lat, lng, delivery }));
    },
    []
  );

  const setDeliverySchedule = useCallback((mode: DeliveryMode, date: string) => {
    setSession((prev) => {
      if (prev.deliveryMode === mode && prev.deliveryDate === date) {
        return prev;
      }
      // Keep lat/lng/delivery so the location stays "ready"; the checkout
      // slot effect re-quotes the date-sensitive delivery fee on change.
      return {
        ...prev,
        deliveryMode: mode,
        deliveryDate: date,
      };
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (session.lat == null || session.lng == null) return;
    if (session.delivery != null) return;

    let cancelled = false;
    fetch("/api/delivery/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: session.lat, lng: session.lng }),
    })
      .then((r) => r.json())
      .then((data: DeliveryCalculation) => {
        if (!cancelled) {
          setSession((prev) => ({ ...prev, delivery: data }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [hydrated, session.lat, session.lng, session.delivery]);

  const setAddress = useCallback(
    (fields: Partial<Pick<DeliverySession, "house" | "street" | "landmark" | "pincode">>) => {
      setSession((prev) => ({ ...prev, ...fields }));
    },
    []
  );

  const setCustomer = useCallback(
    (
      fields: Partial<
        Pick<DeliverySession, "customerName" | "email" | "whatsappPhone" | "altPhone">
      >
    ) => {
      setSession((prev) => {
        const next = { ...prev, ...fields };
        if (
          fields.whatsappPhone != null &&
          fields.whatsappPhone !== prev.whatsappPhone
        ) {
          next.phoneVerified = false;
        }
        return next;
      });
    },
    []
  );

  const setPhoneVerified = useCallback((verified: boolean) => {
    setSession((prev) => ({ ...prev, phoneVerified: verified }));
  }, []);

  const setVerifiedPhone = useCallback((phone: string) => {
    setSession((prev) => ({
      ...prev,
      whatsappPhone: phone,
      phoneVerified: true,
    }));
  }, []);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setSession(EMPTY_DELIVERY_SESSION);
  }, []);

  const isLocationReady = useMemo(
    () => isDeliveryLocationReady(session),
    [session]
  );

  const deliveryModeReady = useMemo(
    () => isDeliveryModeReady(session),
    [session]
  );

  return (
    <DeliverySessionContext.Provider
      value={{
        session,
        sessionReady: hydrated,
        isLocationReady,
        isDeliveryModeReady: deliveryModeReady,
        setLocation,
        setDeliverySchedule,
        setAddress,
        setCustomer,
        setPhoneVerified,
        setVerifiedPhone,
        clearSession,
      }}
    >
      {children}
    </DeliverySessionContext.Provider>
  );
}

export function useDeliverySession() {
  const ctx = useContext(DeliverySessionContext);
  if (!ctx) {
    throw new Error("useDeliverySession must be used within DeliverySessionProvider");
  }
  return ctx;
}
