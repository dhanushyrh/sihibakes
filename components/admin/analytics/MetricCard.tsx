import { LucideIcon, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon?: LucideIcon;
}

export function MetricCard({
  label,
  value,
  change,
  subtitle,
  icon: Icon,
}: MetricCardProps) {
  const trend =
    change === undefined ? null : change > 0 ? "up" : change < 0 ? "down" : "flat";

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[#4B2C20]/50">
          {label}
        </p>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E6D3] text-[#4B2C20]">
            <Icon size={16} />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#4B2C20]">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {trend && change !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              trend === "up"
                ? "bg-emerald-50 text-emerald-700"
                : trend === "down"
                  ? "bg-red-50 text-red-600"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {trend === "up" && <TrendingUp size={10} />}
            {trend === "down" && <TrendingDown size={10} />}
            {trend === "flat" && <Minus size={10} />}
            {change > 0 ? "+" : ""}
            {change}% vs prior period
          </span>
        )}
        {subtitle && (
          <span className="text-[10px] text-[#4B2C20]/40">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
