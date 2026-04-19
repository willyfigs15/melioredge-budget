"use client";

import { createContext, Suspense, useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, DASHBOARD_URL } from "@/lib/api";
import type { User } from "@/types";

type AuthState = {
  user: User | null;
  isReady: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  isReady: false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const handoff = searchParams?.get("token") ?? searchParams?.get("handoff");

      if (handoff) {
        try {
          const { data } = await api.post("/api/auth/handoff", { token: handoff });
          if (data?.valid) {
            setUser({ id: data.user_id, name: data.name, email: data.email });
            const url = new URL(window.location.href);
            url.searchParams.delete("token");
            url.searchParams.delete("handoff");
            window.history.replaceState({}, "", url.toString());
            setReady(true);
            return;
          }
        } catch {
          // fall through to dashboard redirect
        }
        window.location.href = `${DASHBOARD_URL}/login`;
        return;
      }

      try {
        const { data } = await api.get("/api/auth/me");
        setUser(data);
        setReady(true);
      } catch {
        window.location.href = `${DASHBOARD_URL}/login`;
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    window.location.href = `${DASHBOARD_URL}/login`;
  };

  return (
    <AuthContext.Provider value={{ user, isReady, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </Suspense>
  );
}
