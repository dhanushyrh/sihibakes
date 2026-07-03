import { Suspense } from "react";
import { format } from "date-fns";
import { isSupabaseConfigured } from "@/lib/mock-data";
import { DashboardAlertsBanner } from "@/components/admin/dashboard/DashboardAlertsBanner";
import { DashboardInsights } from "@/components/admin/dashboard/DashboardInsights";
import { DashboardProducts } from "@/components/admin/dashboard/DashboardProducts";
import { DashboardStats } from "@/components/admin/dashboard/DashboardStats";
import {
  DashboardInsightsSkeleton,
  DashboardProductsSkeleton,
  DashboardStatsSkeleton,
} from "@/components/admin/dashboard/DashboardSkeletons";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div>
        <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">Dashboard</h1>
        <p className="mt-4 text-sm text-[#4B2C20]/60">
          Connect Supabase to view live dashboard data. Add env vars from .env.example.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-[#4B2C20]/60">
        {format(new Date(), "EEEE, d MMMM yyyy")}
      </p>

      <Suspense fallback={null}>
        <DashboardAlertsBanner />
      </Suspense>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={<DashboardInsightsSkeleton />}>
        <DashboardInsights />
      </Suspense>

      <Suspense fallback={<DashboardProductsSkeleton />}>
        <DashboardProducts />
      </Suspense>
    </div>
  );
}
