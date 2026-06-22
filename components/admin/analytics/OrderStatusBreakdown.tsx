const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-amber-100 text-amber-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  self_delivered: "bg-teal-100 text-teal-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

interface OrderStatusBreakdownProps {
  data: { status: string; count: number }[];
}

export function OrderStatusBreakdown({ data }: OrderStatusBreakdownProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <h3 className="text-sm font-semibold text-[#4B2C20]">Order pipeline</h3>
      <p className="mt-0.5 text-xs text-[#4B2C20]/50">Fulfillment status</p>
      {total === 0 ? (
        <p className="mt-6 text-center text-xs text-[#4B2C20]/40">No orders</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">
            {data.map((d) => (
              <div
                key={d.status}
                className="bg-[#4B2C20] first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${(d.count / total) * 100}%`,
                  opacity: 0.3 + (d.count / total) * 0.7,
                }}
                title={`${d.status}: ${d.count}`}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {data.map((d) => (
              <li
                key={d.status}
                className="flex items-center justify-between text-sm"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                    STATUS_COLORS[d.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {d.status.replace(/_/g, " ")}
                </span>
                <span className="font-medium tabular-nums text-[#4B2C20]">
                  {d.count}
                  <span className="ml-1 text-xs font-normal text-[#4B2C20]/40">
                    ({Math.round((d.count / total) * 100)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
