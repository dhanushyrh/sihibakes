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
} from "@/lib/delivery-session";

type DeliverySessionContextValue = {
  session: DeliverySession;
  isLocationReady: boolean;
  setLocation: (lat: number, lng: number, delivery: DeliveryCalculation | null) => void;
  setAddress: (fields: Partial<Pick<DeliverySession, "house" | "street" | "landmark" | "pincode">>) => void;
  setCustomer: (fields: Partial<Pick<DeliverySession, "customerName" | "phone">>) => void;
  setPhoneVerified: (verified: boolean) => void;
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

  const setAddress = useCallback(
    (fields: Partial<Pick<DeliverySession, "house" | "street" | "landmark" | "pincode">>) => {
      setSession((prev) => ({ ...prev, ...fields }));
    },
    []
  );

  const setCustomer = useCallback(
    (fields: Partial<Pick<DeliverySession, "customerName" | "phone">>) => {
      setSession((prev) => {
        const next = { ...prev, ...fields };
        if (fields.phone && fields.phone !== prev.phone) {
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

  const clearSession = useCallback(() => {
    clearStoredSession();
    setSession(EMPTY_DELIVERY_SESSION);
  }, []);

  const isLocationReady = useMemo(
    () => isDeliveryLocationReady(session),
    [session]
  );

  return (
    <DeliverySessionContext.Provider
      value={{
        session,
        isLocationReady,
        setLocation,
        setAddress,
        setCustomer,
        setPhoneVerified,
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
