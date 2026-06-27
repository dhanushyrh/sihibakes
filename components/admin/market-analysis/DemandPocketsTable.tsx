import type { DemandPocket } from "@/lib/market-analysis";
import { formatCurrency } from "@/lib/delivery";

interface DemandPocketsTableProps {
  pockets: DemandPocket[];
}

export function DemandPocketsTable({ pockets }: DemandPocketsTableProps) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">Demand pockets</h3>
      <p className="mt-0.5 text-xs text-[#4B2C20]/50">
        Areas with high interest — prioritize marketing where conversion is low
      </p>

      {pockets.length === 0 ? (
        <p className="mt-6 text-sm text-[#4B2C20]/45">
          Demand pockets appear once multiple users mark nearby locations.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#4B2C20]/10 text-[10px] uppercase tracking-wide text-[#4B2C20]/45">
                <th className="pb-2 pr-3 font-medium">Area</th>
                <th className="pb-2 pr-3 font-medium">Interested</th>
                <th className="pb-2 pr-3 font-medium">Completed</th>
                <th className="pb-2 pr-3 font-medium">Conversion</th>
                <th className="pb-2 font-medium">Lost revenue</th>
              </tr>
            </thead>
            <tbody>
              {pockets.map((pocket) => (
                <tr
                  key={pocket.label}
                  className="border-b border-[#4B2C20]/5 last:border-0"
                >
                  <td className="py-2.5 pr-3 font-medium text-[#4B2C20]">
                    {pocket.label}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-[#4B2C20]/75">
                    {pocket.interested}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-[#4B2C20]/75">
                    {pocket.completed}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        pocket.conversionRate >= 50
                          ? "bg-emerald-50 text-emerald-700"
                          : pocket.conversionRate >= 25
                            ? "bg-amber-50 text-amber-800"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {pocket.conversionRate}%
                    </span>
                  </td>
                  <td className="py-2.5 tabular-nums text-[#4B2C20]/75">
                    {formatCurrency(pocket.lostRevenueInr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pockets.some((p) => p.topItems.length > 0) && (
            <div className="mt-4 space-y-2">
              {pockets.slice(0, 4).map((pocket) =>
                pocket.topItems.length > 0 ? (
                  <p key={`${pocket.label}-items`} className="text-xs text-[#4B2C20]/55">
                    <span className="font-medium text-[#4B2C20]">{pocket.label}:</span>{" "}
                    {pocket.topItems.join(", ")}
                  </p>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
