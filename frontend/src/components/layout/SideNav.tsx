"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, PieChart, Upload, Repeat, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_URL } from "@/lib/api";

const tabs = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/import", label: "Import", icon: Upload },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:border-r md:border-border md:bg-card/30 md:h-screen md:sticky md:top-0">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
        <Image
          src="/brand/melioredge-logo-dark.svg"
          alt="MeliorEdge"
          width={28}
          height={28}
          className="shrink-0 rounded-md"
          priority
        />
        <div className="font-semibold leading-tight">
          <div>
            <span className="text-foreground">Melior</span>
            <span className="text-primary">Edge</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Budget</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5" aria-label="Primary">
        {tabs.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname?.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <a
          href={DASHBOARD_URL}
          className="flex items-center gap-3 px-3 h-10 rounded-md text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
        >
          <LayoutGrid className="h-4 w-4" />
          Back to Dashboard
        </a>
      </div>
    </aside>
  );
}
