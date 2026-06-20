import { Lightbulb } from "lucide-react";

interface InsightsPanelProps {
  insights: string[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <div className="rounded-2xl border border-[#4B2C20]/15 bg-gradient-to-br from-[#4B2C20] to-[#3d2319] p-5 text-white">
      <div className="flex items-center gap-2">
        <Lightbulb size={18} className="text-[#F5E6D3]" />
        <h3 className="text-sm font-semibold">PM insights</h3>
      </div>
      <p className="mt-1 text-xs text-white/60">
        Actionable takeaways from your data
      </p>
      <ul className="mt-4 space-y-3">
        {insights.map((insight, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm leading-relaxed text-white/90"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5E6D3]" />
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}
