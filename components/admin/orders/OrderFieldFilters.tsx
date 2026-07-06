"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import {
  createEmptyOrderFieldFilter,
  filterFieldLabel,
  filterOpLabel,
  filterValueLabel,
  isActiveOrderFieldFilter,
  ORDER_FILTER_FIELD_OPTIONS,
  type OrderFieldFilter,
  type OrderFilterField,
  type OrderFilterOp,
} from "@/lib/admin-order-filters";

type OrderFieldFiltersProps = {
  filters: OrderFieldFilter[];
  onChange: (filters: OrderFieldFilter[]) => void;
};

function ValueMultiSelect({
  field,
  selected,
  onChange,
}: {
  field: OrderFilterField;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options =
    ORDER_FILTER_FIELD_OPTIONS.find((o) => o.key === field)?.values ?? [];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const label =
    selected.length === 0
      ? "Select values"
      : selected.length === 1
        ? filterValueLabel(field, selected[0])
        : `${selected.length} values`;

  const toggleValue = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((v) => v !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[42px] w-full items-center justify-between gap-2 rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20]"
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#4B2C20]/40 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full min-w-[12rem] overflow-y-auto rounded-xl border border-[#4B2C20]/10 bg-white py-1 shadow-lg ring-1 ring-[#4B2C20]/5">
          {options.map(({ key, label: optionLabel }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#F5E6D3]/40"
            >
              <input
                type="checkbox"
                checked={selected.includes(key)}
                onChange={() => toggleValue(key)}
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

function FilterRow({
  filter,
  onChange,
  onRemove,
  canRemove,
}: {
  filter: OrderFieldFilter;
  onChange: (filter: OrderFieldFilter) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-[minmax(7.5rem,1fr)_minmax(6.5rem,1fr)_minmax(10rem,2fr)_auto]">
      <div className="min-w-0">
        <label className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50">
          Field
        </label>
        <select
          value={filter.field}
          onChange={(e) =>
            onChange({
              field: e.target.value as OrderFilterField,
              op: filter.op,
              values: [],
            })
          }
          className="mt-1 block h-[42px] w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20]"
        >
          {ORDER_FILTER_FIELD_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50">
          Operator
        </label>
        <select
          value={filter.op}
          onChange={(e) =>
            onChange({
              ...filter,
              op: e.target.value as OrderFilterOp,
            })
          }
          className="mt-1 block h-[42px] w-full rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20]"
        >
          <option value="eq">is</option>
          <option value="neq">is not</option>
        </select>
      </div>

      <div className="min-w-0">
        <label className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50">
          Value
        </label>
        <div className="mt-1">
          <ValueMultiSelect
            field={filter.field}
            selected={filter.values}
            onChange={(values) => onChange({ ...filter, values })}
          />
        </div>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center justify-self-end rounded-xl text-[#4B2C20]/50 hover:bg-[#F5E6D3]/60 hover:text-[#4B2C20] md:justify-self-auto"
          aria-label="Remove filter"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function OrderFieldFilters({ filters, onChange }: OrderFieldFiltersProps) {
  const activeFilters = filters.filter(isActiveOrderFieldFilter);

  const updateFilter = (index: number, next: OrderFieldFilter) => {
    const copy = [...filters];
    copy[index] = next;
    onChange(copy);
  };

  const removeFilter = (index: number) => {
    if (filters.length <= 1) {
      onChange([createEmptyOrderFieldFilter()]);
      return;
    }
    onChange(filters.filter((_, i) => i !== index));
  };

  const addFilter = () => {
    onChange([...filters, createEmptyOrderFieldFilter()]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50">
          Filters
        </p>
        {activeFilters.length > 0 && (
          <p className="text-[10px] text-[#4B2C20]/45 sm:text-right">
            {activeFilters
              .map(
                (f) =>
                  `${filterFieldLabel(f.field)} ${filterOpLabel(f.op)} ${f.values
                    .map((v) => filterValueLabel(f.field, v))
                    .join(", ")}`
              )
              .join(" · ")}
          </p>
        )}
      </div>

      {filters.map((filter, index) => (
        <FilterRow
          key={index}
          filter={filter}
          onChange={(next) => updateFilter(index, next)}
          onRemove={() => removeFilter(index)}
          canRemove={filters.length > 1 || isActiveOrderFieldFilter(filter)}
        />
      ))}

      <button
        type="button"
        onClick={addFilter}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-[#4B2C20]/70 ring-1 ring-[#4B2C20]/10 hover:ring-[#4B2C20]/20"
      >
        <Plus size={14} />
        Add filter
      </button>
    </div>
  );
}
