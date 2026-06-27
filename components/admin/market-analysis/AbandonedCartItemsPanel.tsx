import type { AbandonedCartItemMetric } from "@/lib/market-analysis";

interface AbandonedCartItemsPanelProps {
  items: AbandonedCartItemMetric[];
  averageCartValueInr: number;
}

export function AbandonedCartItemsPanel({
  items,
  averageCartValueInr,
}: AbandonedCartItemsPanelProps) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">
        Top abandoned cart items
      </h3>
      <p className="mt-0.5 text-xs text-[#4B2C20]/50">
        Products left behind after checkout intent
      </p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-[#4B2C20]/45">
          Abandoned cart items appear once users reach checkout and leave.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex items-center justify-between gap-3 border-b border-[#4B2C20]/5 pb-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-[#4B2C20]">
                  {item.title}
                </p>
                <p className="text-[10px] text-[#4B2C20]/45">
                  {item.abandonedSessions} abandoned sessions
                </p>
              </div>
              <span className="text-sm tabular-nums font-semibold text-[#4B2C20]">
                {item.totalQuantity} units
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-[#4B2C20]/50">
        Avg abandoned cart value: ₹{averageCartValueInr.toLocaleString("en-IN")}
      </p>
    </div>
  );
}
