const DEFAULT_TEST_BASE_URL =
  "https://robotapitest-in.borzodelivery.com/api/business/1.8";

export const BORZO_VENDOR_NAME = "Borzo";

/** Motorbike (up to 20 kg) — Borzo two-wheeler delivery. */
export const BORZO_VEHICLE_TYPE_MOTORBIKE = 8;

export function isBorzoConfigured(): boolean {
  return Boolean(process.env.BORZO_AUTH_TOKEN?.trim());
}

export function getBorzoConfig() {
  const authToken = process.env.BORZO_AUTH_TOKEN?.trim();
  if (!authToken) return null;

  return {
    authToken,
    baseUrl:
      process.env.BORZO_API_BASE_URL?.trim().replace(/\/$/, "") ||
      DEFAULT_TEST_BASE_URL,
    vehicleTypeId: Number(
      process.env.BORZO_VEHICLE_TYPE_ID ?? BORZO_VEHICLE_TYPE_MOTORBIKE
    ),
  };
}
