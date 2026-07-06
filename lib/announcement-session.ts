import type { SiteAnnouncement } from "@/lib/types";

const STORAGE_PREFIX = "sihi_announcement_seen_";

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

export function hasSeenAnnouncement(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(storageKey(id)) === "1";
  } catch {
    return false;
  }
}

export function markAnnouncementSeen(id: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(id), "1");
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function hasSeenAllAnnouncements(ids: string[]): boolean {
  return ids.length > 0 && ids.every((id) => hasSeenAnnouncement(id));
}

export function markAnnouncementsSeen(ids: string[]): void {
  for (const id of ids) {
    markAnnouncementSeen(id);
  }
}

export function filterUnseenAnnouncements<
  T extends Pick<SiteAnnouncement, "id">,
>(announcements: T[]): T[] {
  return announcements.filter((announcement) => !hasSeenAnnouncement(announcement.id));
}
