"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/home", icon: "home" },
    { name: "Kitchen", href: "/ahuva", icon: "restaurant" },
    { name: "Gym", href: "/gym", icon: "directions_walk" },
    { name: "Sanctuary", href: "/sanctuary", icon: "spa" },
    { name: "Medicine", href: "/medicine", icon: "medication" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-alive-bg/90 backdrop-blur-xl border-t border-sanctos-navy/5 pb-safe max-w-md mx-auto">
      <div className="flex justify-around items-center h-20 px-2">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href === "/ahuva" && pathname === "/kitchen");
          return (
            <Link
              key={link.name}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] py-1 px-2 rounded-lg transition-colors ${
                isActive ? "text-sanctos-navy font-semibold" : "text-sanctos-navy/50 hover:text-sanctos-navy"
              }`}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? "fill" : ""}`}>
                {link.icon}
              </span>
              <span className="text-[11px] mt-1 font-medium">{link.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
