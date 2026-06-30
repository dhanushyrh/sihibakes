import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNotificationProvider } from "@/components/admin/AdminNotificationProvider";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export const dynamic = "force-dynamic";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminNotificationProvider>
      <div className="min-h-screen bg-[#F5E6D3]">
        <AdminSidebar />
        <AdminTopBar />
        <main className="min-h-screen md:ml-64">
          <div className="overflow-y-auto p-4 pt-16 md:p-8 md:pt-8">{children}</div>
        </main>
      </div>
    </AdminNotificationProvider>
  );
}
