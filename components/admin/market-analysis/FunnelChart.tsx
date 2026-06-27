import type { FunnelStage } from "@/lib/market-analysis";

interface FunnelChartProps {
  stages: FunnelStage[];
}

export function FunnelChart({ stages }: FunnelChartProps) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">Checkout funnel</h3>
      <p className="mt-0.5 text-xs text-[#4B2C20]/50">
        How users progress from cart to completed order
      </p>
      <div className="mt-5 space-y-3">
        {stages.map((stage) => {
          const widthPct = Math.max((stage.count / max) * 100, stage.count > 0 ? 8 : 0);
          return (
            <div key={stage.stage}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#4B2C20]">
                  {stage.label}
                </span>
                <div className="flex items-center gap-2">
                  {stage.rateFromPrevious != null && stage.stage !== "cart" && (
                    <span className="text-[10px] text-[#4B2C20]/45">
                      {stage.rateFromPrevious}% from prev
                    </span>
                  )}
                  <span className="text-xs tabular-nums font-semibold text-[#4B2C20]">
                    {stage.count}
                  </span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F5E6D3]">
                <div
                  className="h-full rounded-full bg-[#4B2C20] transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
