"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Car, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/calendar", label: "Calendrier", icon: Calendar },
  { href: "/drivers", label: "Conducteurs", icon: Car },
  { href: "/group", label: "Groupe", icon: Users },
  { href: "/profile", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 safe-area-inset-bottom">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-gray-500"
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-xs", isActive && "font-medium")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
