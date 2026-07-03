import { fetchDashboardAlerts } from "@/lib/dashboard";
import { AdminAlertsBanner } from "@/components/admin/AdminAlertsBanner";

export async function DashboardAlertsBanner() {
  const alerts = await fetchDashboardAlerts();
  if (alerts.length === 0) return null;
  return <AdminAlertsBanner alerts={alerts} />;
}
