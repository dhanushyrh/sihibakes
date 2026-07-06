import { createClient } from "@/lib/supabase/server";
import type { SiteAnnouncement } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/mock-data";

export type PublicAnnouncement = Pick<
  SiteAnnouncement,
  "id" | "title" | "description" | "disclaimer"
>;

export const MOCK_SITE_ANNOUNCEMENT: SiteAnnouncement = {
  id: "mock-announcement",
  title: "We're Live! Enjoy 25% OFF on Everything",
  description:
    "To celebrate the online launch of Sihi Desserts & Bakes, enjoy 25% OFF on all products plus FREE delivery within 5 km for our first week!",
  disclaimer: "Offer valid till 19th July.",
  starts_at: "2026-07-06T00:00:00+05:30",
  ends_at: "2026-07-19T23:59:59+05:30",
  is_active: true,
  created_at: "2026-07-06T00:00:00+05:30",
  updated_at: "2026-07-06T00:00:00+05:30",
};

export function isAnnouncementLive(
  announcement: Pick<SiteAnnouncement, "is_active" | "starts_at" | "ends_at">,
  now = new Date()
): boolean {
  if (!announcement.is_active) return false;
  if (new Date(announcement.starts_at) > now) return false;
  if (new Date(announcement.ends_at) < now) return false;
  return true;
}

export function filterActiveAnnouncements(
  announcements: SiteAnnouncement[],
  now = new Date()
): SiteAnnouncement[] {
  return announcements.filter((announcement) => isAnnouncementLive(announcement, now));
}

export async function getActiveSiteAnnouncements(): Promise<PublicAnnouncement[]> {
  if (!isSupabaseConfigured()) {
    return isAnnouncementLive(MOCK_SITE_ANNOUNCEMENT)
      ? [
          {
            id: MOCK_SITE_ANNOUNCEMENT.id,
            title: MOCK_SITE_ANNOUNCEMENT.title,
            description: MOCK_SITE_ANNOUNCEMENT.description,
            disclaimer: MOCK_SITE_ANNOUNCEMENT.disclaimer,
          },
        ]
      : [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_announcements")
    .select("id, title, description, disclaimer, starts_at, ends_at, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data?.length) return [];

  return filterActiveAnnouncements(data as SiteAnnouncement[]).map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    description: announcement.description,
    disclaimer: announcement.disclaimer,
  }));
}
