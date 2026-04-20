"use client";

import { Suspense } from "react";
import { Toaster } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav } from "./BottomNav";
import { TopBar, DesktopHeader } from "./TopBar";
import { SideNav } from "./SideNav";

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
    <div className="min-h-screen flex">
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <DesktopHeader />
        <main className="flex-1 pb-24 md:pb-8 px-4 md:px-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
        <BottomNav />
      </div>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: { background: "hsl(217.2 32.6% 10%)", border: "1px solid hsl(217.2 32.6% 17.5%)", color: "hsl(210 40% 98%)" },
        }}
      />
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
