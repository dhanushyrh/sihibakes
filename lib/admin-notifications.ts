export const ADMIN_SOUND_STORAGE_KEY = "sihi_admin_sound_enabled";
export const ADMIN_NOTIFY_PERMISSION_KEY = "sihi_admin_notify_asked";
export const ADMIN_WHATSAPP_VIEWING_KEY = "admin_whatsapp_viewing_conversation_id";

/** Dispatched when orders change so Kitchen / Orders can soft-refresh. */
export const ADMIN_ORDERS_CHANGED_EVENT = "sihi:admin-orders-changed";

export type AdminNotificationCounts = {
  pendingOrders: number;
  /** Paid orders for shop-today still in kitchen pipeline. */
  kitchenActiveToday: number;
  whatsappUnread: number;
  newEnquiries: number;
};

export function isAdminSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_SOUND_STORAGE_KEY) !== "false";
}

export function setAdminSoundEnabled(enabled: boolean): void {
  localStorage.setItem(ADMIN_SOUND_STORAGE_KEY, enabled ? "true" : "false");
}

export function getViewingWhatsAppConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_WHATSAPP_VIEWING_KEY);
}

export function setViewingWhatsAppConversationId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) sessionStorage.setItem(ADMIN_WHATSAPP_VIEWING_KEY, id);
  else sessionStorage.removeItem(ADMIN_WHATSAPP_VIEWING_KEY);
}

let audioContext: AudioContext | null = null;

export function unlockAdminAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    // iOS may block until user gesture — ignore
  }
}

export function playAdminAlertSound(): void {
  if (typeof window === "undefined" || !isAdminSoundEnabled()) return;

  try {
    if (!audioContext) audioContext = new AudioContext();
    const ctx = audioContext;

    const emit = () => {
      const now = ctx.currentTime;
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration + 0.05);
      };

      playTone(880, 0, 0.12);
      playTone(1174.66, 0.14, 0.18);
    };

    // A suspended context schedules tones that never play; resume first, then emit.
    if (ctx.state === "suspended") {
      void ctx.resume().then(emit).catch(() => {});
    } else {
      emit();
    }
  } catch {
    // Audio blocked
  }
}

export async function requestAdminNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function showAdminBrowserNotification(params: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  try {
    const notification = new Notification(params.title, {
      body: params.body,
      tag: params.tag,
      icon: "/logo.png",
    });
    notification.onclick = () => {
      window.focus();
      if (params.url) window.location.href = params.url;
      notification.close();
    };
  } catch {
    // Notification API unavailable
  }
}

export function formatAdminDocumentTitle(counts: AdminNotificationCounts): string {
  const total =
    counts.pendingOrders +
    counts.whatsappUnread +
    counts.newEnquiries;
  const base = "Sihi Bakes Admin";
  return total > 0 ? `(${total}) ${base}` : base;
}

export function dispatchAdminOrdersChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_ORDERS_CHANGED_EVENT));
}

export type AdminAlertParams = {
  title: string;
  body: string;
  tag: string;
  url?: string;
  playSound?: boolean;
};
