import { getBorzoConfig } from "./config";
import type { BorzoApiResponse, BorzoOrder, BorzoOrderRequest } from "./types";

export class BorzoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: string[],
    readonly parameterErrors?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BorzoApiError";
  }
}

async function borzoRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string> } = {}
): Promise<BorzoApiResponse<T>> {
  const config = getBorzoConfig();
  if (!config) {
    throw new BorzoApiError("Borzo is not configured", 500);
  }

  const url = new URL(`${config.baseUrl}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: {
      "X-DV-Auth-Token": config.authToken,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  let data: BorzoApiResponse<T>;
  try {
    data = (await res.json()) as BorzoApiResponse<T>;
  } catch {
    throw new BorzoApiError(`Borzo API returned invalid JSON (${res.status})`, res.status);
  }

  if (!res.ok || !data.is_successful) {
    throw new BorzoApiError(
      data.errors?.join(", ") || `Borzo API request failed (${res.status})`,
      res.status,
      data.errors,
      data.parameter_errors
    );
  }

  return data;
}

export async function calculateBorzoOrder(
  payload: BorzoOrderRequest
): Promise<BorzoOrder> {
  const config = getBorzoConfig();
  const data = await borzoRequest<BorzoOrder>("/calculate-order", {
    body: {
      type: "standard",
      vehicle_type_id: config?.vehicleTypeId,
      ...payload,
    },
  });

  if (!data.order) {
    throw new BorzoApiError("Borzo calculate-order returned no order", 502);
  }

  return data.order;
}

export async function createBorzoOrder(
  payload: BorzoOrderRequest
): Promise<BorzoOrder> {
  const config = getBorzoConfig();
  const data = await borzoRequest<BorzoOrder>("/create-order", {
    body: {
      type: "standard",
      vehicle_type_id: config?.vehicleTypeId,
      ...payload,
    },
  });

  if (!data.order) {
    throw new BorzoApiError("Borzo create-order returned no order", 502);
  }

  return data.order;
}

export async function getBorzoCourier(orderId: number) {
  const data = await borzoRequest<never>("/courier", {
    query: { order_id: String(orderId) },
  });
  return data.courier ?? null;
}
