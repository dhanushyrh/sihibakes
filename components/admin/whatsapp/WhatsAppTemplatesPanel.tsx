"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Plus, RefreshCw } from "lucide-react";
import type { WhatsAppTemplateCategory } from "@/lib/whatsapp/templates";

type TemplateRow = {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
};

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-green-50 text-green-800 ring-green-200",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  REJECTED: "bg-red-50 text-red-800 ring-red-200",
};

export function WhatsAppTemplatesPanel() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    language: "en",
    category: "UTILITY" as WhatsAppTemplateCategory,
    body: "",
    footer: "Sihi Bakes",
    example1: "",
    example2: "",
    example3: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/whatsapp/templates");
    const data = await res.json();

    if (!res.ok) {
      setConfigured(data.configured !== false);
      setError(data.error ?? "Failed to load templates");
      setTemplates([]);
    } else {
      setConfigured(true);
      setTemplates((data.templates ?? []) as TemplateRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const seedDefaults = async () => {
    setSeeding(true);
    setSeedResult(null);
    setError(null);
    const res = await fetch("/api/admin/whatsapp/templates/seed", { method: "POST" });
    const data = await res.json();
    setSeeding(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to seed templates");
      return;
    }

    const parts: string[] = [];
    if (data.created?.length) parts.push(`Created: ${data.created.join(", ")}`);
    if (data.skipped?.length) parts.push(`Skipped (exist): ${data.skipped.join(", ")}`);
    if (data.notes?.length) parts.push((data.notes as string[]).join(" · "));
    if (data.failed?.length) {
      parts.push(
        `Failed: ${data.failed.map((f: { name: string; error: string }) => `${f.name} (${f.error})`).join("; ")}`
      );
    }
    setSeedResult(data.message ?? parts.join(" · "));
    await load();
  };

  const createCustom = async () => {
    setCreating(true);
    setError(null);

    const examples: string[] = [form.example1, form.example2, form.example3].filter(
      Boolean
    );
    const components: Record<string, unknown>[] = [
      {
        type: "BODY",
        text: form.body,
        ...(examples.length
          ? { example: { body_text: [examples] } }
          : {}),
      },
    ];
    if (form.footer.trim()) {
      components.push({ type: "FOOTER", text: form.footer.trim() });
    }

    const res = await fetch("/api/admin/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        language: form.language,
        category: form.category,
        allowCategoryChange: true,
        components,
      }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create template");
      return;
    }

    setShowForm(false);
    setForm({
      name: "",
      language: "en",
      category: "UTILITY",
      body: "",
      footer: "Sihi Bakes",
      example1: "",
      example2: "",
      example3: "",
    });
    setSeedResult(`Template "${form.name}" submitted (status: ${data.status ?? "PENDING"}).`);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#4B2C20]" />
            <h2 className="font-medium text-[#4B2C20]">Message templates</h2>
          </div>
          <p className="mt-1 text-xs text-[#4B2C20]/50">
            Create via Meta Graph API. New templates are PENDING until Meta approves them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
          >
            <Plus size={14} />
            Custom template
          </button>
          <button
            type="button"
            onClick={() => void seedDefaults()}
            disabled={seeding || !configured}
            className="rounded-xl bg-[#4B2C20] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {seeding ? "Submitting..." : "Create Sihi defaults"}
          </button>
        </div>
      </div>

      {!configured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Set <code className="text-xs">WHATSAPP_WABA_ID</code> and ensure your access token has{" "}
          <code className="text-xs">whatsapp_business_management</code> permission.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {seedResult && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900 ring-1 ring-green-200">
          {seedResult}
        </p>
      )}

      {showForm && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#4B2C20]/10">
          <h3 className="text-sm font-medium text-[#4B2C20]">New utility template</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="template_name (lowercase_underscores)"
              className="rounded-xl px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
            />
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as WhatsAppTemplateCategory,
                }))
              }
              className="rounded-xl px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
            >
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
            <input
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              placeholder="Language (en)"
              className="rounded-xl px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
            />
            <input
              value={form.footer}
              onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))}
              placeholder="Footer"
              className="rounded-xl px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
            />
          </div>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={3}
            placeholder="Body text with {{1}}, {{2}} variables..."
            className="mt-3 w-full rounded-xl px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input
              value={form.example1}
              onChange={(e) => setForm((f) => ({ ...f, example1: e.target.value }))}
              placeholder="Example {{1}}"
              className="rounded-xl px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
            />
            <input
              value={form.example2}
              onChange={(e) => setForm((f) => ({ ...f, example2: e.target.value }))}
              placeholder="Example {{2}}"
              className="rounded-xl px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
            />
            <input
              value={form.example3}
              onChange={(e) => setForm((f) => ({ ...f, example3: e.target.value }))}
              placeholder="Example {{3}}"
              className="rounded-xl px-3 py-2 text-sm ring-1 ring-[#4B2C20]/10"
            />
          </div>
          <button
            type="button"
            onClick={() => void createCustom()}
            disabled={creating || !form.name.trim() || !form.body.trim()}
            className="mt-3 rounded-xl bg-[#4B2C20] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {creating ? "Submitting..." : "Submit to Meta"}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-[#4B2C20]/50">
            <Loader2 size={16} className="animate-spin" />
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#4B2C20]/50">
            No templates found. Click &quot;Create Sihi defaults&quot; to submit the order/OTP templates.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#4B2C20]/10 bg-[#F5E6D3]/30 text-left">
                  <th className="px-4 py-3 text-xs font-semibold">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold">Language</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-[#4B2C20]/5 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{t.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                          STATUS_STYLES[t.status] ?? "bg-gray-50 text-gray-700 ring-gray-200"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4B2C20]/70">{t.category}</td>
                    <td className="px-4 py-3 text-xs text-[#4B2C20]/70">{t.language}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
