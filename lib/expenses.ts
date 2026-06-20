import type { ExpenseCategory } from "@/lib/types";
import { EXPENSE_CATEGORY_OPTIONS } from "@/lib/constants";

export function expenseCategoryLabel(category: ExpenseCategory): string {
  return (
    EXPENSE_CATEGORY_OPTIONS.find((c) => c.key === category)?.label ?? category
  );
}

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  purchase: "bg-blue-100 text-blue-800",
  miscellaneous: "bg-purple-100 text-purple-800",
  transport: "bg-amber-100 text-amber-800",
  others: "bg-gray-100 text-gray-700",
};
