"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

export function MobileNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  const inDeliveryFlow = pathname.startsWith("/orders/delivery");
  const hideNav =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders/delivery/checkout") ||
    pathname === "/orders/delivery";

  if (hideNav) return null;

  const cartHref = inDeliveryFlow ? "/orders/delivery/cart" : "/cart";

  const links = [
    { href: "/orders", label: "Order", icon: ClipboardList },
    { href: cartHref, label: "Cart", icon: ShoppingBag, badge: itemCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-chocolate/10 bg-cream/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-lg">
        {links.map(({ href, label, icon: Icon, badge }) => {
          const active =
            pathname === href ||
            (href === "/orders" && pathname.startsWith("/orders"));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition ${
                active
                  ? "font-medium text-chocolate"
                  : "text-chocolate/50"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {label}
              {badge ? (
                <span className="absolute right-[calc(50%-22px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-chocolate px-1 text-[10px] font-bold text-cream">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
