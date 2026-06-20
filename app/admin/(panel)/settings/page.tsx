"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShopSettings, DeliveryFeeSlab } from "@/lib/types";
import { normalizeClosedDates } from "@/lib/shop-closed-days";
import { format } from "date-fns";
import { Eye, Pencil, Save } from "lucide-react";
import { KitchenLocationMap } from "@/components/admin/settings/KitchenLocationMap";
import {
  DEFAULT_DELIVERY_FENCE,
  formatDeliveryFence,
  getDeliveryFence,
  maxFenceKm,
} from "@/lib/delivery-fence";

type SettingsSectionId = "store" | "shop" | "closed" | "slabs";

function ViewField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-[#4B2C20]/50">{label}</p>
      <p className="mt-0.5 text-sm text-[#4B2C20]">
        {value.trim() ? value : "—"}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  isEditing,
  onEdit,
  onCancelEdit,
}: {
  title: string;
  description?: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-medium text-[#4B2C20]">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-[#4B2C20]/50">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => (isEditing ? onCancelEdit() : onEdit())}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F5E6D3] text-[#4B2C20] transition hover:bg-[#4B2C20]/10"
        title={isEditing ? "View mode" : "Edit"}
      >
        {isEditing ? <Eye size={16} /> : <Pencil size={14} />}
      </button>
    </div>
  );
}

function SectionActions({
  saving,
  error,
  onCancel,
  onSave,
}: {
  saving: boolean;
  error?: string | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 border-t border-[#4B2C20]/10 pt-4">
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-[#4B2C20]/20 py-2.5 text-sm font-medium text-[#4B2C20]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#4B2C20] py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [slabs, setSlabs] = useState<DeliveryFeeSlab[]>([]);
  const [editingSection, setEditingSection] =
    useState<SettingsSectionId | null>(null);
  const [storeDraft, setStoreDraft] = useState({
    store_address: "",
    fssai_license_no: "",
    phone: "",
    alt_phone: "",
  });
  const [shopDraft, setShopDraft] = useState({
    kitchen_lat: 0,
    kitchen_lng: 0,
    delivery_fence: DEFAULT_DELIVERY_FENCE,
    orders_accepting: true,
  });
  const [slabsDraft, setSlabsDraft] = useState<DeliveryFeeSlab[]>([]);
  const [newClosedDate, setNewClosedDate] = useState("");
  const [savingSection, setSavingSection] = useState<SettingsSectionId | null>(
    null
  );
  const [closedDateBusy, setClosedDateBusy] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [{ data: s }, { data: sl }] = await Promise.all([
      supabase.from("shop_settings").select("*").limit(1).single(),
      supabase.from("delivery_fee_slabs").select("*").order("min_km"),
    ]);
    if (s) {
      const row = s as ShopSettings;
      setSettings({
        ...row,
        closed_dates: normalizeClosedDates(s.closed_dates),
        store_address: s.store_address ?? "",
        fssai_license_no: s.fssai_license_no ?? "",
        phone: s.phone ?? "",
        alt_phone: s.alt_phone ?? "",
        delivery_fence_north_km:
          row.delivery_fence_north_km ?? row.max_delivery_radius_km ?? 15,
        delivery_fence_south_km:
          row.delivery_fence_south_km ?? 5,
        delivery_fence_east_km:
          row.delivery_fence_east_km ?? row.max_delivery_radius_km ?? 15,
        delivery_fence_west_km:
          row.delivery_fence_west_km ?? row.max_delivery_radius_km ?? 15,
      });
    }
    setSlabs((sl ?? []) as DeliveryFeeSlab[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const cancelSection = () => {
    setEditingSection(null);
    setSectionError(null);
    setNewClosedDate("");
  };

  const startStoreEdit = () => {
    if (!settings) return;
    setSectionError(null);
    setStoreDraft({
      store_address: settings.store_address,
      fssai_license_no: settings.fssai_license_no,
      phone: settings.phone,
      alt_phone: settings.alt_phone,
    });
    setEditingSection("store");
  };

  const startShopEdit = () => {
    if (!settings) return;
    setSectionError(null);
    setShopDraft({
      kitchen_lat: settings.kitchen_lat,
      kitchen_lng: settings.kitchen_lng,
      delivery_fence: getDeliveryFence(settings),
      orders_accepting: settings.orders_accepting,
    });
    setEditingSection("shop");
  };

  const startClosedEdit = () => {
    setSectionError(null);
    setNewClosedDate("");
    setEditingSection("closed");
  };

  const startSlabsEdit = () => {
    setSectionError(null);
    setSlabsDraft(slabs.map((s) => ({ ...s })));
    setEditingSection("slabs");
  };

  const saveStoreDetails = async () => {
    if (!settings) return;
    setSavingSection("store");
    setSectionError(null);
    const { error } = await supabase
      .from("shop_settings")
      .update({
        store_address: storeDraft.store_address.trim(),
        fssai_license_no: storeDraft.fssai_license_no.trim(),
        phone: storeDraft.phone.trim(),
        alt_phone: storeDraft.alt_phone.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);
    setSavingSection(null);
    if (error) {
      setSectionError(error.message);
      return;
    }
    setEditingSection(null);
    await load();
  };

  const saveShopDelivery = async () => {
    if (!settings) return;
    setSavingSection("shop");
    setSectionError(null);
    const fence = shopDraft.delivery_fence;
    const { error } = await supabase
      .from("shop_settings")
      .update({
        kitchen_lat: shopDraft.kitchen_lat,
        kitchen_lng: shopDraft.kitchen_lng,
        delivery_fence_north_km: fence.north,
        delivery_fence_south_km: fence.south,
        delivery_fence_east_km: fence.east,
        delivery_fence_west_km: fence.west,
        max_delivery_radius_km: maxFenceKm(fence),
        orders_accepting: shopDraft.orders_accepting,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);
    setSavingSection(null);
    if (error) {
      setSectionError(error.message);
      return;
    }
    setEditingSection(null);
    await load();
  };

  const saveSlabs = async () => {
    setSavingSection("slabs");
    setSectionError(null);
    const results = await Promise.all(
      slabsDraft.map((slab) =>
        supabase
          .from("delivery_fee_slabs")
          .update({
            min_km: slab.min_km,
            max_km: slab.max_km,
            fee_inr: slab.fee_inr,
          })
          .eq("id", slab.id)
      )
    );
    const failed = results.find((r) => r.error);
    setSavingSection(null);
    if (failed?.error) {
      setSectionError(failed.error.message);
      return;
    }
    setEditingSection(null);
    await load();
  };

  const addClosedDate = async () => {
    if (!newClosedDate || !settings) return;
    if (settings.closed_dates.includes(newClosedDate)) return;

    setClosedDateBusy(true);
    setSectionError(null);

    try {
      const res = await fetch("/api/admin/delivery/close-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newClosedDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSectionError(data.error ?? "Could not close this date");
        return;
      }
      setNewClosedDate("");
      await load();
    } catch {
      setSectionError("Could not close this date");
    } finally {
      setClosedDateBusy(false);
    }
  };

  const removeClosedDate = async (date: string) => {
    setClosedDateBusy(true);
    setSectionError(null);

    try {
      const res = await fetch("/api/admin/delivery/open-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSectionError(data.error ?? "Could not reopen this date");
        return;
      }
      await load();
    } catch {
      setSectionError("Could not reopen this date");
    } finally {
      setClosedDateBusy(false);
    }
  };

  if (!settings) {
    return <p className="text-sm text-[#4B2C20]/50">Loading settings...</p>;
  }

  const editingStore = editingSection === "store";
  const editingShop = editingSection === "shop";
  const editingClosed = editingSection === "closed";
  const editingSlabs = editingSection === "slabs";

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
        Settings
      </h1>
      <p className="mt-1 text-sm text-[#4B2C20]/60">
        Tap the pencil on a section to edit it.
      </p>

      {/* Store details */}
      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
        <SectionHeader
          title="Store details"
          description="Shown to customers on the landing page and storefront footer."
          isEditing={editingStore}
          onEdit={startStoreEdit}
          onCancelEdit={cancelSection}
        />
        {editingStore ? (
          <>
            <div className="mt-4 grid gap-3">
              <div>
                <label className="text-xs text-[#4B2C20]/60">Address</label>
                <textarea
                  rows={2}
                  value={storeDraft.store_address}
                  onChange={(e) =>
                    setStoreDraft({
                      ...storeDraft,
                      store_address: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Shop / kitchen address"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-[#4B2C20]/60">
                    FSSAI license no.
                  </label>
                  <input
                    type="text"
                    value={storeDraft.fssai_license_no}
                    onChange={(e) =>
                      setStoreDraft({
                        ...storeDraft,
                        fssai_license_no: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#4B2C20]/60">Phone</label>
                  <input
                    type="tel"
                    value={storeDraft.phone}
                    onChange={(e) =>
                      setStoreDraft({ ...storeDraft, phone: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#4B2C20]/60">Alt. phone</label>
                  <input
                    type="tel"
                    value={storeDraft.alt_phone}
                    onChange={(e) =>
                      setStoreDraft({
                        ...storeDraft,
                        alt_phone: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <SectionActions
              saving={savingSection === "store"}
              error={editingStore ? sectionError : null}
              onCancel={cancelSection}
              onSave={saveStoreDetails}
            />
          </>
        ) : (
          <div className="mt-4 grid gap-4">
            <ViewField label="Address" value={settings.store_address} />
            <div className="grid gap-4 sm:grid-cols-2">
              <ViewField
                label="FSSAI license no."
                value={settings.fssai_license_no}
              />
              <ViewField label="Phone" value={settings.phone} />
              <ViewField label="Alt. phone" value={settings.alt_phone} />
            </div>
          </div>
        )}
      </section>

      {/* Shop & delivery */}
      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
        <SectionHeader
          title="Shop & delivery"
          isEditing={editingShop}
          onEdit={startShopEdit}
          onCancelEdit={cancelSection}
        />
        {editingShop ? (
          <>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-[#4B2C20]/60">
                  Store location
                </p>
                <p className="mt-0.5 text-xs text-[#4B2C20]/45">
                  Used to calculate delivery distance and fees.
                </p>
                <div className="mt-3">
                  <KitchenLocationMap
                    lat={shopDraft.kitchen_lat}
                    lng={shopDraft.kitchen_lng}
                    deliveryFence={shopDraft.delivery_fence}
                    onChange={(kitchen_lat, kitchen_lng) =>
                      setShopDraft((prev) => ({
                        ...prev,
                        kitchen_lat,
                        kitchen_lng,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[#4B2C20]/60">
                  Delivery zone (km from kitchen)
                </p>
                <p className="mt-0.5 text-xs text-[#4B2C20]/45">
                  Set how far you deliver in each direction. Shown as a rectangle on
                  the customer map.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ["north", "North"],
                      ["south", "South"],
                      ["east", "East"],
                      ["west", "West"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-[#4B2C20]/60">{label}</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={shopDraft.delivery_fence[key]}
                        onChange={(e) =>
                          setShopDraft((prev) => ({
                            ...prev,
                            delivery_fence: {
                              ...prev.delivery_fence,
                              [key]: Number(e.target.value),
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-[#4B2C20]/60">
                    Kitchen latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={shopDraft.kitchen_lat}
                    onChange={(e) =>
                      setShopDraft({
                        ...shopDraft,
                        kitchen_lat: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#4B2C20]/60">
                    Kitchen longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={shopDraft.kitchen_lng}
                    onChange={(e) =>
                      setShopDraft({
                        ...shopDraft,
                        kitchen_lng: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={shopDraft.orders_accepting}
                      onChange={(e) =>
                        setShopDraft({
                          ...shopDraft,
                          orders_accepting: e.target.checked,
                        })
                      }
                    />
                    Accepting orders
                  </label>
                </div>
              </div>
            </div>
            <SectionActions
              saving={savingSection === "shop"}
              error={editingShop ? sectionError : null}
              onCancel={cancelSection}
              onSave={saveShopDelivery}
            />
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-[#4B2C20]/50">Store location</p>
              <div className="mt-2">
                <KitchenLocationMap
                  lat={settings.kitchen_lat}
                  lng={settings.kitchen_lng}
                  deliveryFence={getDeliveryFence(settings)}
                  readOnly
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ViewField
                label="Kitchen latitude"
                value={String(settings.kitchen_lat)}
              />
              <ViewField
                label="Kitchen longitude"
                value={String(settings.kitchen_lng)}
              />
              <ViewField
                label="Delivery zone"
                value={formatDeliveryFence(getDeliveryFence(settings))}
                className="sm:col-span-2"
              />
              <ViewField
                label="Orders"
                value={settings.orders_accepting ? "Accepting" : "Paused"}
              />
            </div>
          </div>
        )}
      </section>

      {/* Closed dates */}
      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
        <SectionHeader
          title="Closed dates"
          description={
            editingClosed
              ? "Closes the day immediately — delivery windows are turned off."
              : "Days when the store is closed for deliveries."
          }
          isEditing={editingClosed}
          onEdit={startClosedEdit}
          onCancelEdit={cancelSection}
        />
        {editingClosed && (
          <div className="mt-4 flex gap-2">
            <input
              type="date"
              value={newClosedDate}
              onChange={(e) => setNewClosedDate(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={closedDateBusy || !newClosedDate}
              onClick={addClosedDate}
              className="rounded-full bg-[#4B2C20] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {closedDateBusy ? "Saving..." : "Close date"}
            </button>
          </div>
        )}
        {editingClosed && sectionError && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
            {sectionError}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.closed_dates.length === 0 ? (
            <p className="text-xs text-[#4B2C20]/40">No closed dates.</p>
          ) : (
            settings.closed_dates.map((date) => (
              <span
                key={date}
                className="flex items-center gap-1 rounded-full bg-[#F5E6D3] px-3 py-1 text-xs text-[#4B2C20]"
              >
                {format(new Date(date + "T00:00:00"), "d MMM yyyy")}
                {editingClosed && (
                  <button
                    type="button"
                    disabled={closedDateBusy}
                    onClick={() => removeClosedDate(date)}
                    className="text-red-500 disabled:opacity-50"
                    title="Reopen date"
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        {editingClosed && (
          <div className="mt-4 border-t border-[#4B2C20]/10 pt-4">
            <button
              type="button"
              onClick={cancelSection}
              className="w-full rounded-full border border-[#4B2C20]/20 py-2.5 text-sm font-medium text-[#4B2C20]"
            >
              Done
            </button>
          </div>
        )}
      </section>

      {/* Delivery fee slabs */}
      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
        <SectionHeader
          title="Delivery fee slabs"
          isEditing={editingSlabs}
          onEdit={startSlabsEdit}
          onCancelEdit={cancelSection}
        />
        {editingSlabs ? (
          <>
            <div className="mt-4 space-y-2">
              {slabsDraft.map((slab, i) => (
                <div
                  key={slab.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <input
                    type="number"
                    value={slab.min_km}
                    onChange={(e) => {
                      const updated = [...slabsDraft];
                      updated[i] = { ...slab, min_km: Number(e.target.value) };
                      setSlabsDraft(updated);
                    }}
                    className="w-16 rounded-lg border px-2 py-1"
                  />
                  <span>–</span>
                  <input
                    type="number"
                    value={slab.max_km}
                    onChange={(e) => {
                      const updated = [...slabsDraft];
                      updated[i] = { ...slab, max_km: Number(e.target.value) };
                      setSlabsDraft(updated);
                    }}
                    className="w-16 rounded-lg border px-2 py-1"
                  />
                  <span>km → ₹</span>
                  <input
                    type="number"
                    value={slab.fee_inr}
                    onChange={(e) => {
                      const updated = [...slabsDraft];
                      updated[i] = {
                        ...slab,
                        fee_inr: Number(e.target.value),
                      };
                      setSlabsDraft(updated);
                    }}
                    className="w-20 rounded-lg border px-2 py-1"
                  />
                </div>
              ))}
            </div>
            <SectionActions
              saving={savingSection === "slabs"}
              error={editingSlabs ? sectionError : null}
              onCancel={cancelSection}
              onSave={saveSlabs}
            />
          </>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-[#4B2C20]/10">
            <div className="grid grid-cols-2 gap-2 border-b border-[#4B2C20]/10 bg-[#F5E6D3]/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50">
              <span>Distance</span>
              <span className="text-center">Fee</span>
            </div>
            <ul className="divide-y divide-[#4B2C20]/5">
              {slabs.map((slab) => (
                <li
                  key={slab.id}
                  className="grid grid-cols-2 items-center gap-2 px-3 py-2.5 text-sm text-[#4B2C20]"
                >
                  <span>
                    {slab.min_km}–{slab.max_km} km
                  </span>
                  <span className="text-center font-medium">₹{slab.fee_inr}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
