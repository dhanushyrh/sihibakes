"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Ticket,
  Megaphone,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  TrendingUp,
  Users,
  Banknote,
  MessageSquare,
  MessagesSquare,
  Star,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWhatsAppUnreadCount } from "@/lib/hooks/useWhatsAppUnreadCount";
import { useAdminNotifications } from "@/components/admin/AdminNotificationProvider";
import type { AdminNotificationCounts } from "@/lib/admin-notifications";

type NavBadgeKey = "pendingOrders" | "newEnquiries" | "whatsappUnread";

const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: NavBadgeKey;
}[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/market-analysis", label: "Market Analysis", icon: TrendingUp },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: "pendingOrders" },
  { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquare, badge: "newEnquiries" },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessagesSquare, badge: "whatsappUnread" },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/expenses", label: "Expenses", icon: Banknote },
  { href: "/admin/delivery-slots", label: "Delivery & Stock", icon: Calendar },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function getNavBadgeCount(
  badge: NavBadgeKey,
  counts: AdminNotificationCounts,
  whatsappUnread: number
): number {
  switch (badge) {
    case "pendingOrders":
      return counts.pendingOrders;
    case "newEnquiries":
      return counts.newEnquiries;
    case "whatsappUnread":
      return whatsappUnread;
  }
}

function NavBadge({ count, tone }: { count: number; tone: "amber" | "blue" | "green" }) {
  if (count <= 0) return null;

  const toneClass =
    tone === "green"
      ? "bg-green-500 text-white"
      : tone === "blue"
        ? "bg-blue-400 text-[#4B2C20]"
        : "bg-amber-400 text-[#4B2C20]";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClass}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { unreadCount: whatsappUnread } = useWhatsAppUnreadCount();
  const { counts } = useAdminNotifications();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const NavContent = () => (
    <>
      <div className="border-b border-white/10 px-4 py-5">
        <p className="font-serif text-lg font-semibold text-white">Sihi Admin</p>
        <p className="text-xs text-white/50">Manage your bakery</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active =
            pathname === href ||
            (href !== "/admin" && pathname.startsWith(href + "/"));
          const badgeCount = badge
            ? getNavBadgeCount(badge, counts, whatsappUnread)
            : 0;
          const badgeTone =
            badge === "whatsappUnread"
              ? "green"
              : badge === "newEnquiries"
                ? "blue"
                : "amber";

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {badge && <NavBadge count={badgeCount} tone={badgeTone} />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-[#4B2C20] text-white md:hidden"
      >
        <Menu size={20} />
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-[#4B2C20] transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-4 text-white md:hidden"
        >
          <X size={20} />
        </button>
        <NavContent />
      </aside>
    </>
  );
}
