"use client";

import { Suspense } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

function Shell({ children }: { children: React.ReactNode }) {
  const { isReady } = useAuth();
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying access…</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pb-24 md:pb-8 px-4 md:px-8 max-w-5xl w-full mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
