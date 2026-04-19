"use client";

import Link from "next/link";
import { LogOut, LayoutGrid } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { DASHBOARD_URL } from "@/lib/api";

export function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block h-6 w-6 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">M</span>
          <span className="hidden sm:inline">MeliorEdge Budget</span>
          <span className="sm:hidden">Budget</span>
        </Link>
        <div className="flex items-center gap-3">
          <a
            href={DASHBOARD_URL}
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <LayoutGrid className="h-4 w-4" />
          </a>
          {user && (
            <span className="hidden md:inline text-sm text-muted-foreground">
              {user.name || user.email}
            </span>
          )}
          <button
            onClick={() => logout()}
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
