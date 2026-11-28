"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/home", icon: "home" },
    { name: "Ahuva", href: "/ahuva", icon: "restaurant" },
    { name: "Gym", href: "/gym", icon: "directions_walk" },
    { name: "Sanctuary", href: "/sanctuary", icon: "spa" },
    { name: "Medicine", href: "/medicine", icon: "medication" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md border-t border-sanctos-navy/5 bg-alive-bg/90 pb-safe backdrop-blur-xl">
      <div className="flex h-20 items-center justify-around px-2">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href === "/ahuva" && pathname.startsWith("/ahuva"));
          return (
            <Link
              key={link.name}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg px-2 py-1 transition-colors ${isActive ? "font-semibold text-sanctos-navy" : "text-sanctos-navy/50 hover:text-sanctos-navy"}`}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? "fill" : ""}`}>
                {link.icon}
              </span>
              <span className="mt-1 text-[11px] font-medium">{link.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
