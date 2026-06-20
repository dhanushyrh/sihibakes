import Link from "next/link";
import type { AnalyticsPeriod } from "@/lib/analytics";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

interface PeriodTabsProps {
  current: AnalyticsPeriod;
}

export function PeriodTabs({ current }: PeriodTabsProps) {
  return (
    <div className="flex rounded-full bg-white p-1 ring-1 ring-[#4B2C20]/10">
      {PERIODS.map(({ value, label }) => (
        <Link
          key={value}
          href={`/admin/analytics?period=${value}`}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            current === value
              ? "bg-[#4B2C20] text-white"
              : "text-[#4B2C20]/60 hover:text-[#4B2C20]"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
