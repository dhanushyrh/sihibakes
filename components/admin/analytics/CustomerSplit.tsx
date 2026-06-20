interface CustomerSplitProps {
  firstTime: number;
  repeat: number;
  repeatRate: number;
}

export function CustomerSplit({
  firstTime,
  repeat,
  repeatRate,
}: CustomerSplitProps) {
  const total = firstTime + repeat;
  const firstPct = total > 0 ? Math.round((firstTime / total) * 100) : 0;
  const repeatPct = total > 0 ? Math.round((repeat / total) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">Customers</h3>
      <p className="mt-0.5 text-xs text-[#4B2C20]/50">First-time vs returning</p>
      <div className="mt-4 flex h-4 overflow-hidden rounded-full">
        <div
          className="bg-[#4B2C20]/80"
          style={{ width: `${firstPct}%` }}
          title={`First-time: ${firstTime}`}
        />
        <div
          className="bg-[#F5E6D3] ring-1 ring-inset ring-[#4B2C20]/20"
          style={{ width: `${repeatPct}%` }}
          title={`Returning: ${repeat}`}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-[#4B2C20]">
            {firstTime}
          </p>
          <p className="text-xs text-[#4B2C20]/50">First-time ({firstPct}%)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-[#4B2C20]">
            {repeat}
          </p>
          <p className="text-xs text-[#4B2C20]/50">
            Returning ({repeatRate}% rate)
          </p>
        </div>
      </div>
    </div>
  );
}
