import { fetchDashboardStats } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/delivery";

export async function DashboardStats() {
  const stats = await fetchDashboardStats();

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      {[
        { label: "Today's Orders", value: String(stats.todayOrderCount) },
        { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue) },
        { label: "Awaiting confirmation", value: String(stats.pendingCount) },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10"
        >
          <p className="text-xs text-[#4B2C20]/50">{stat.label}</p>
          <p className="mt-1 text-2xl font-semibold text-[#4B2C20]">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
