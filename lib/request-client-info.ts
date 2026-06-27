import { createHash } from "crypto";

export type DeviceType = "mobile" | "tablet" | "desktop" | "bot" | "unknown";

export interface RequestClientInfo {
  ipAddress: string | null;
  ipHash: string | null;
  userAgent: string | null;
  deviceType: DeviceType;
  browserName: string | null;
  osName: string | null;
}

function hashIp(ip: string): string {
  const salt = process.env.ACTIVITY_IP_HASH_SALT ?? "sihi-activity";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function extractClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return null;
}

function detectDeviceType(ua: string): DeviceType {
  const lower = ua.toLowerCase();
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit/i.test(lower)) {
    return "bot";
  }
  if (/ipad|tablet|kindle|playbook|silk/i.test(lower)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(lower)) {
    return "mobile";
  }
  if (ua.length > 0) return "desktop";
  return "unknown";
}

function detectBrowser(ua: string): string | null {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  return null;
}

function detectOs(ua: string): string | null {
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return null;
}

export function parseRequestClientInfo(request: Request): RequestClientInfo {
  const userAgent = request.headers.get("user-agent")?.trim() || null;
  const ipAddress = extractClientIp(request);

  return {
    ipAddress,
    ipHash: ipAddress ? hashIp(ipAddress) : null,
    userAgent,
    deviceType: userAgent ? detectDeviceType(userAgent) : "unknown",
    browserName: userAgent ? detectBrowser(userAgent) : null,
    osName: userAgent ? detectOs(userAgent) : null,
  };
}
