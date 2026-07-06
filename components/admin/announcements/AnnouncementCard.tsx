"use client";

import type { SiteAnnouncement } from "@/lib/types";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { Megaphone, Pencil, Trash2 } from "lucide-react";
import { Spinner } from "@/components/admin/ui/Spinner";

function scheduleStatus(announcement: SiteAnnouncement) {
  const now = new Date();
  if (isBefore(now, parseISO(announcement.starts_at))) {
    return { label: "Scheduled", tone: "bg-amber-100 text-amber-800" };
  }
  if (isAfter(now, parseISO(announcement.ends_at))) {
    return { label: "Expired", tone: "bg-red-100 text-red-700" };
  }
  if (announcement.is_active) {
    return { label: "Live", tone: "bg-emerald-100 text-emerald-800" };
  }
  return null;
}

type AnnouncementCardProps = {
  announcement: SiteAnnouncement;
  deleting?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function AnnouncementCard({
  announcement,
  deleting = false,
  onEdit,
  onDelete,
}: AnnouncementCardProps) {
  const status = scheduleStatus(announcement);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10 ${
        !announcement.is_active ? "opacity-90" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 bg-[#F5E6D3]/60 px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4B2C20]/10 text-[#4B2C20]">
            <Megaphone size={18} />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 font-serif text-base font-semibold text-[#4B2C20]">
              {announcement.title}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {!announcement.is_active && (
            <span className="rounded-full bg-[#4B2C20]/10 px-2 py-0.5 text-[10px] font-medium text-[#4B2C20]/60">
              Inactive
            </span>
          )}
          {status && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.tone}`}
            >
              {status.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-3 text-sm text-[#4B2C20]/70">
          {announcement.description}
        </p>
        {announcement.disclaimer && (
          <p className="mt-2 line-clamp-2 text-xs text-[#4B2C20]/50">
            {announcement.disclaimer}
          </p>
        )}

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[#4B2C20]/50">Starts</dt>
            <dd className="font-medium text-[#4B2C20]">
              {format(parseISO(announcement.starts_at), "d MMM yyyy, h:mm a")}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[#4B2C20]/50">Ends</dt>
            <dd className="font-medium text-[#4B2C20]">
              {format(parseISO(announcement.ends_at), "d MMM yyyy, h:mm a")}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#F5E6D3] py-2 text-xs font-medium text-[#4B2C20]"
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center justify-center rounded-full px-3 py-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>
    </article>
  );
}
