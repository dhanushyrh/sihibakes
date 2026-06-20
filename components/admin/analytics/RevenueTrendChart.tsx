interface RevenueTrendChartProps {
  data: { label: string; revenue: number; orders: number }[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const width = 100;
  const height = 48;
  const points = data.map((d, i) => {
    const x = data.length <= 1 ? width / 2 : (i / (data.length - 1)) * width;
    const y = height - (d.revenue / maxRevenue) * (height - 4);
    return `${x},${y}`;
  });

  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">Revenue trend</h3>
      <p className="mt-0.5 text-xs text-[#4B2C20]/50">Daily paid revenue</p>
      <div className="mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-24 w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4B2C20" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4B2C20" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#revenueGrad)" />
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="#4B2C20"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-2 flex justify-between text-[9px] text-[#4B2C20]/40">
          <span>{data[0]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}
