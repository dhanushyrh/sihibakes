import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5E6D3]">
      <AdminSidebar />
      <main className="min-h-screen md:ml-64">
        <div className="overflow-y-auto p-4 pt-16 md:p-8 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
