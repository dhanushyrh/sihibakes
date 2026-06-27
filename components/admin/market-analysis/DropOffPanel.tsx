import type { DropOffStage } from "@/lib/market-analysis";

interface DropOffPanelProps {
  stages: DropOffStage[];
  bounceRate: number;
}

export function DropOffPanel({ stages, bounceRate }: DropOffPanelProps) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">Drop-off analysis</h3>
      <p className="mt-0.5 text-xs text-[#4B2C20]/50">
        Where users leave after showing intent (30 min abandonment window)
      </p>

      <div className="mt-4 rounded-xl bg-[#FAF6F0] px-4 py-3">
        <p className="text-xs text-[#4B2C20]/55">Overall bounce rate</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-[#4B2C20]">
          {bounceRate}%
        </p>
      </div>

      {stages.length === 0 ? (
        <p className="mt-4 text-sm text-[#4B2C20]/45">
          No abandoned sessions in this period yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {stages.map((stage) => (
            <li
              key={stage.stage}
              className="flex items-center justify-between gap-3 border-b border-[#4B2C20]/5 pb-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-[#4B2C20]">
                  {stage.label}
                </p>
                <p className="text-[10px] text-[#4B2C20]/45">
                  {stage.pctOfAbandoned}% of abandonments
                </p>
              </div>
              <span className="text-sm tabular-nums font-semibold text-[#4B2C20]">
                {stage.abandoned}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
