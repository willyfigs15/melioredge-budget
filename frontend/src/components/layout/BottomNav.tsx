"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, PieChart, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Txns", icon: ListOrdered },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/import", label: "Import", icon: Upload },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur md:static md:border-t-0 md:bg-transparent md:max-w-5xl md:mx-auto md:px-8 safe-bottom"
      aria-label="Primary"
    >
      <ul className="flex md:hidden items-stretch justify-around h-16">
        {tabs.map((t) => {
          const active = pathname === t.href || (t.href !== "/" && pathname?.startsWith(t.href));
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 text-xs",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
