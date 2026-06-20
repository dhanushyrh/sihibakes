"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ORDER_STATUS_OPTIONS } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";

interface OrderStatusMultiSelectProps {
  selected: OrderStatus[];
  onChange: (selected: OrderStatus[]) => void;
  compact?: boolean;
}

export function OrderStatusMultiSelect({
  selected,
  onChange,
  compact,
}: OrderStatusMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const allSelected = selected.length === 0;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleAll = () => {
    onChange([]);
  };

  const toggleStatus = (key: OrderStatus) => {
    if (allSelected) {
      onChange([key]);
      return;
    }
    if (selected.includes(key)) {
      const next = selected.filter((s) => s !== key);
      onChange(next);
    } else {
      onChange([...selected, key]);
    }
  };

  const label = allSelected
    ? "All statuses"
    : selected.length === 1
      ? ORDER_STATUS_OPTIONS.find((s) => s.key === selected[0])?.label ??
        selected[0]
      : `${selected.length} statuses`;

  return (
    <div
      ref={rootRef}
      className={`relative shrink-0 ${compact ? "w-[9.5rem]" : "min-w-[11rem]"}`}
    >
      <label className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50">
        {compact ? "Status" : "Order status"}
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Order status"
        className={`mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20] ${
          compact ? "h-[42px] py-0" : "min-w-[11rem] py-2"
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#4B2C20]/40 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-[14rem] overflow-y-auto rounded-xl border border-[#4B2C20]/10 bg-white py-1 shadow-lg ring-1 ring-[#4B2C20]/5"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#F5E6D3]/40">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 shrink-0 rounded accent-[#4B2C20]"
            />
            <span className="font-medium text-[#4B2C20]">All</span>
          </label>
          <div className="my-1 border-t border-[#4B2C20]/10" />
          {ORDER_STATUS_OPTIONS.map(({ key, label: optionLabel }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#F5E6D3]/40"
            >
              <input
                type="checkbox"
                checked={!allSelected && selected.includes(key)}
                onChange={() => toggleStatus(key)}
                className="h-4 w-4 shrink-0 rounded accent-[#4B2C20]"
              />
              <span className="text-[#4B2C20]">{optionLabel}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
