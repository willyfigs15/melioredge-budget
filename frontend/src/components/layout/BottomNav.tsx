"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, PieChart, Repeat, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Txns", icon: ListOrdered },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/recurring", label: "Recur", icon: Repeat },
  { href: "/import", label: "Import", icon: Upload },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur safe-bottom"
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around h-16">
        {tabs.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname?.startsWith(t.href);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 text-[11px]",
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
