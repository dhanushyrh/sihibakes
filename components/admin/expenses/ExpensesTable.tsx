"use client";

import { formatCurrency } from "@/lib/delivery";
import {
  EXPENSE_CATEGORY_COLORS,
  expenseCategoryLabel,
} from "@/lib/expenses";
import type { Expense } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

interface ExpensesTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export function ExpensesTable({
  expenses,
  onEdit,
  onDelete,
}: ExpensesTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[#4B2C20]/10 bg-[#F5E6D3]/30 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Category
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#4B2C20]">
                Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#4B2C20]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b border-[#4B2C20]/5 last:border-0"
              >
                <td className="whitespace-nowrap px-4 py-3 text-[#4B2C20]/80">
                  {format(parseISO(expense.expense_date), "d MMM yyyy")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      EXPENSE_CATEGORY_COLORS[expense.category]
                    }`}
                  >
                    {expenseCategoryLabel(expense.category)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[#4B2C20]">
                    {expense.description}
                  </p>
                  {expense.notes && (
                    <p className="mt-0.5 text-xs text-[#4B2C20]/50">
                      {expense.notes}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#4B2C20]">
                  {formatCurrency(expense.amount_inr)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(expense)}
                      className="rounded-lg p-2 text-[#4B2C20]/50 hover:bg-[#F5E6D3]/50 hover:text-[#4B2C20]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(expense.id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
