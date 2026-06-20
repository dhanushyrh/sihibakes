"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/constants";
import { getTodayDate } from "@/lib/inventory";
import { ExpensesTable } from "@/components/admin/expenses/ExpensesTable";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { Banknote, Plus } from "lucide-react";

type CategoryFilter = "all" | ExpenseCategory;

const emptyExpense = (): Partial<Expense> => ({
  category: "purchase",
  description: "",
  amount_inr: 0,
  expense_date: getTodayDate(),
  notes: "",
});

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [editing, setEditing] = useState<Partial<Expense> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error) {
      setExpenses((data ?? []) as Expense[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return expenses;
    return expenses.filter((e) => e.category === filter);
  }, [expenses, filter]);

  const totalAmount = filtered.reduce((sum, e) => sum + e.amount_inr, 0);

  const categoryCounts = useMemo(() => {
    const counts: Record<ExpenseCategory, number> = {
      purchase: 0,
      miscellaneous: 0,
      transport: 0,
      others: 0,
    };
    for (const e of expenses) {
      counts[e.category] += 1;
    }
    return counts;
  }, [expenses]);

  const openNew = () => {
    setEditing(emptyExpense());
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing({ ...expense });
    setFormError(null);
    setShowForm(true);
  };

  const save = async () => {
    if (!editing?.description?.trim()) {
      setFormError("Description is required.");
      return;
    }
    if (!editing.amount_inr || editing.amount_inr <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (!editing.expense_date) {
      setFormError("Date is required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      category: editing.category ?? "purchase",
      description: editing.description.trim(),
      amount_inr: Math.round(editing.amount_inr),
      expense_date: editing.expense_date,
      notes: editing.notes?.trim() || null,
    };

    const { error } = editing.id
      ? await supabase.from("expenses").update(payload).eq("id", editing.id)
      : await supabase.from("expenses").insert(payload);

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setShowForm(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  };

  const filters: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "All" },
    ...EXPENSE_CATEGORY_OPTIONS.map((c) => ({
      key: c.key as CategoryFilter,
      label: c.label,
    })),
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            {expenses.length} expense{expenses.length === 1 ? "" : "s"}
            {filter !== "all"
              ? ` · ₹${totalAmount.toLocaleString("en-IN")} in view`
              : ` · ₹${totalAmount.toLocaleString("en-IN")} total`}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#4B2C20] px-5 py-2.5 text-sm font-medium text-white"
        >
          <Plus size={16} /> Add expense
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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
            {key !== "all" && ` (${categoryCounts[key]})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-12 text-center text-sm text-[#4B2C20]/50">Loading…</p>
      ) : expenses.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-white p-12 text-center ring-1 ring-[#4B2C20]/10">
          <Banknote className="mx-auto text-[#4B2C20]/30" size={40} />
          <p className="mt-4 font-medium text-[#4B2C20]">No expenses yet</p>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            Track purchases, transport, and other business costs
          </p>
          <button
            type="button"
            onClick={openNew}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#4B2C20] px-5 py-2.5 text-sm text-white"
          >
            <Plus size={16} /> Add expense
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-center text-sm text-[#4B2C20]/50">
          No expenses in this category.
        </p>
      ) : (
        <ExpensesTable
          expenses={filtered}
          onEdit={openEdit}
          onDelete={remove}
        />
      )}

      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="font-serif text-lg font-semibold text-[#4B2C20]">
              {editing.id ? "Edit expense" : "New expense"}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-[#4B2C20]">Category</span>
                <select
                  value={editing.category ?? "purchase"}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      category: e.target.value as ExpenseCategory,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
                >
                  {EXPENSE_CATEGORY_OPTIONS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[#4B2C20]">Description</span>
                <input
                  type="text"
                  value={editing.description ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  placeholder="e.g. Mascarpone from supplier"
                  className="mt-1.5 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-medium text-[#4B2C20]">Amount (₹)</span>
                  <input
                    type="number"
                    min={1}
                    value={editing.amount_inr || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        amount_inr: Number(e.target.value),
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-[#4B2C20]">Date</span>
                  <input
                    type="date"
                    value={editing.expense_date ?? getTodayDate()}
                    onChange={(e) =>
                      setEditing({ ...editing, expense_date: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="font-medium text-[#4B2C20]">
                  Notes <span className="font-normal text-[#4B2C20]/40">(optional)</span>
                </span>
                <textarea
                  value={editing.notes ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Invoice #, vendor, etc."
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
                />
              </label>
            </div>

            {formError && (
              <p className="mt-3 text-sm text-red-600">{formError}</p>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={saving}
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
                disabled={saving}
                onClick={save}
                className="flex-1 rounded-full bg-[#4B2C20] py-2.5 text-sm text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
