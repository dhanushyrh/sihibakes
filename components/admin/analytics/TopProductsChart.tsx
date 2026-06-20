import Image from "next/image";
import { formatCurrency } from "@/lib/delivery";
import type { ProductMetric } from "@/lib/analytics";

interface TopProductsChartProps {
  products: ProductMetric[];
}

export function TopProductsChart({ products }: TopProductsChartProps) {
  const max = Math.max(...products.map((p) => p.revenue), 1);

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">Top products</h3>
      <p className="mt-0.5 text-xs text-[#4B2C20]/50">By revenue</p>
      {products.length === 0 ? (
        <p className="mt-6 text-center text-xs text-[#4B2C20]/40">No sales yet</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {products.map((p, i) => (
            <li key={p.productId} className="flex items-center gap-3">
              <span className="w-4 text-xs font-medium text-[#4B2C20]/30">
                {i + 1}
              </span>
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#F5E6D3]">
                <Image
                  src={p.imagePath || "/hero-tiramisu.png"}
                  alt={p.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#4B2C20]">
                  {p.title}
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F5E6D3]">
                  <div
                    className="h-full rounded-full bg-[#4B2C20]"
                    style={{ width: `${(p.revenue / max) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-[#4B2C20]">
                  {formatCurrency(p.revenue)}
                </p>
                <p className="text-[10px] text-[#4B2C20]/40">{p.units} units</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
