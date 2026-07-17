import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminNotificationProvider } from "@/components/admin/AdminNotificationProvider";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminNotificationProvider>
      <AdminChrome>{children}</AdminChrome>
    </AdminNotificationProvider>
  );
}
