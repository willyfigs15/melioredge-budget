"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className="md:hidden sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/brand/melioredge-logo-dark.svg"
            alt="MeliorEdge"
            width={26}
            height={26}
            className="shrink-0 rounded-md"
            priority
          />
          <span>
            <span className="text-foreground">Melior</span>
            <span className="text-primary">Edge</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
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

export function DesktopHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="hidden md:flex sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur items-center justify-end px-6 gap-4">
      {user && (
        <span className="text-sm text-muted-foreground">
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
    </header>
  );
}
