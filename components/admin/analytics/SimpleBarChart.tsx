interface SimpleBarChartProps {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  valuePrefix?: string;
  formatValue?: (n: number) => string;
}

export function SimpleBarChart({
  title,
  subtitle,
  data,
  valuePrefix = "",
  formatValue,
}: SimpleBarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = formatValue ?? ((n: number) => `${valuePrefix}${n}`);

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">{title}</h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-[#4B2C20]/50">{subtitle}</p>
      )}
      <div className="mt-4 flex items-end gap-1 sm:gap-1.5" style={{ height: 140 }}>
        {data.map((d) => (
          <div
            key={d.label}
            className="group flex flex-1 flex-col items-center gap-1"
          >
            <span className="text-[9px] font-medium tabular-nums text-[#4B2C20]/60 opacity-0 transition group-hover:opacity-100">
              {fmt(d.value)}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-[#4B2C20] transition-all group-hover:bg-[#3d2319]"
                style={{
                  height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
                  minHeight: d.value > 0 ? 4 : 0,
                }}
              />
            </div>
            <span className="text-[9px] text-[#4B2C20]/50">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
