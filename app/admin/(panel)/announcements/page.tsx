"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SiteAnnouncement } from "@/lib/types";
import { AnnouncementCard } from "@/components/admin/announcements/AnnouncementCard";
import { CardGridSkeleton } from "@/components/admin/ui/AdminPageSkeleton";
import { Spinner } from "@/components/admin/ui/Spinner";
import { Megaphone, Plus } from "lucide-react";

type ActiveFilter = "all" | "active" | "inactive";

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStartsAt(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function defaultEndsAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

const emptyAnnouncement = (): Partial<SiteAnnouncement> => ({
  title: "",
  description: "",
  disclaimer: "",
  starts_at: defaultStartsAt(),
  ends_at: defaultEndsAt(),
  is_active: true,
});

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<SiteAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActiveFilter>("all");
  const [editing, setEditing] = useState<Partial<SiteAnnouncement> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("site_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setAnnouncements((data ?? []) as SiteAnnouncement[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const activeCount = announcements.filter((a) => a.is_active).length;

  const filtered = useMemo(() => {
    if (filter === "active") return announcements.filter((a) => a.is_active);
    if (filter === "inactive") return announcements.filter((a) => !a.is_active);
    return announcements;
  }, [announcements, filter]);

  const save = async () => {
    if (saving || !editing) return;

    const title = editing.title?.trim();
    const description = editing.description?.trim();
    if (!title || !description) {
      setFormError("Title and description are required.");
      return;
    }
    if (!editing.starts_at || !editing.ends_at) {
      setFormError("Start and end dates are required.");
      return;
    }
    if (new Date(editing.ends_at) <= new Date(editing.starts_at)) {
      setFormError("End date must be after start date.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      title,
      description,
      disclaimer: editing.disclaimer?.trim() || null,
      starts_at: editing.starts_at,
      ends_at: editing.ends_at,
      is_active: editing.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (editing.id) {
      await supabase.from("site_announcements").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("site_announcements").insert(payload);
    }

    setShowForm(false);
    setEditing(null);
    await load();
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?") || deletingId) return;
    setDeletingId(id);
    await supabase.from("site_announcements").delete().eq("id", id);
    await load();
    setDeletingId(null);
  };

  const filters: { key: ActiveFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Inactive" },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            Announcements
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            {announcements.length} total · {activeCount} active
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(emptyAnnouncement());
            setFormError(null);
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#4B2C20] px-5 py-2.5 text-sm font-medium text-white"
        >
          <Plus size={16} /> Add announcement
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              filter === key
                ? "bg-[#4B2C20] text-white"
                : "bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
            }`}
          >
            {label}
            {key === "active" && ` (${activeCount})`}
            {key === "inactive" && ` (${announcements.length - activeCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6">
          <CardGridSkeleton count={4} />
        </div>
      ) : announcements.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-white p-12 text-center ring-1 ring-[#4B2C20]/10">
          <Megaphone className="mx-auto text-[#4B2C20]/30" size={40} />
          <p className="mt-4 font-medium text-[#4B2C20]">No announcements yet</p>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            Create a promo or launch message for the orders hub
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing(emptyAnnouncement());
              setFormError(null);
              setShowForm(true);
            }}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#4B2C20] px-5 py-2.5 text-sm text-white"
          >
            <Plus size={16} /> Add announcement
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-center text-sm text-[#4B2C20]/50">
          No announcements match this filter.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              deleting={deletingId === announcement.id}
              onEdit={() => {
                setEditing(announcement);
                setFormError(null);
                setShowForm(true);
              }}
              onDelete={() => remove(announcement.id)}
            />
          ))}
        </div>
      )}

      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <h2 className="font-serif text-lg font-semibold text-[#4B2C20]">
              {editing.id ? "Edit announcement" : "New announcement"}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Title"
                value={editing.title ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                className="w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
              />
              <textarea
                placeholder="Description"
                rows={4}
                value={editing.description ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                className="w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
              />
              <textarea
                placeholder="Disclaimer (optional)"
                rows={2}
                value={editing.disclaimer ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, disclaimer: e.target.value })
                }
                className="w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
              />
              <label className="block text-xs font-medium text-[#4B2C20]/60">
                Starts at
                <input
                  type="datetime-local"
                  value={
                    editing.starts_at
                      ? toDatetimeLocalValue(editing.starts_at)
                      : ""
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      starts_at: new Date(e.target.value).toISOString(),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
                />
              </label>
              <label className="block text-xs font-medium text-[#4B2C20]/60">
                Ends at
                <input
                  type="datetime-local"
                  value={
                    editing.ends_at ? toDatetimeLocalValue(editing.ends_at) : ""
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      ends_at: new Date(e.target.value).toISOString(),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-[#4B2C20]">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) =>
                    setEditing({ ...editing, is_active: e.target.checked })
                  }
                />
                Active
              </label>
              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setFormError(null);
                }}
                className="flex-1 rounded-full border border-[#4B2C20]/10 py-2.5 text-sm text-[#4B2C20]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#4B2C20] py-2.5 text-sm text-white disabled:opacity-50"
              >
                {saving && <Spinner size="sm" />}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
