import Link from "next/link";
import type { MarketAnalysisPeriod } from "@/lib/market-analysis";

const PERIODS: { value: MarketAnalysisPeriod; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

interface MarketAnalysisPeriodTabsProps {
  current: MarketAnalysisPeriod;
}

export function MarketAnalysisPeriodTabs({
  current,
}: MarketAnalysisPeriodTabsProps) {
  return (
    <div className="flex rounded-full bg-white p-1 ring-1 ring-[#4B2C20]/10">
      {PERIODS.map(({ value, label }) => (
        <Link
          key={value}
          href={`/admin/market-analysis?period=${value}`}
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
