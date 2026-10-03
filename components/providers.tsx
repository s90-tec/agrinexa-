"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "@/lib/api/auth";
import { setAccessToken } from "@/lib/api/client";
import type { AuthResult, User } from "@/types";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  accept: (result: AuthResult) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within Providers");
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const accept = (result: AuthResult) => {
    setAccessToken(result.tokens.access_token);
    sessionStorage.setItem("agrinexa.access", result.tokens.access_token);
    sessionStorage.setItem("agrinexa.refresh", result.tokens.refresh_token);
    setUser(result.user);
  };

  const logout = async () => {
    const refresh = sessionStorage.getItem("agrinexa.refresh");
    try { if (refresh) await authApi.logout(refresh); } catch { /* Local logout still completes when the API is unavailable. */ }
    sessionStorage.removeItem("agrinexa.access");
    sessionStorage.removeItem("agrinexa.refresh");
    setAccessToken(null);
    setUser(null);
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const refresh = sessionStorage.getItem("agrinexa.refresh");
        if (refresh) {
          const tokens = await authApi.refresh(refresh);
          sessionStorage.setItem("agrinexa.refresh", tokens.refresh_token);
          sessionStorage.setItem("agrinexa.access", tokens.access_token);
          setAccessToken(tokens.access_token);
        } else {
          setAccessToken(sessionStorage.getItem("agrinexa.access"));
        }
        if (sessionStorage.getItem("agrinexa.access")) {
          const current = await authApi.me();
          if (active) setUser(current);
        }
      } catch {
        sessionStorage.removeItem("agrinexa.access");
        sessionStorage.removeItem("agrinexa.refresh");
        setAccessToken(null);
      } finally {
        if (active) setReady(true);
      }
    };
    void restore();
    return () => { active = false; };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, ready, accept, logout }}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}