"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { authApi, tokenStore } from "@/lib/api";
import type { AuthResponse, User } from "@/types/auth";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth";

type AuthContextValue = {
  user: User | null;
  /** True until the initial "restore session from stored token" check finishes. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  /** Re-fetch the signed-in user (e.g. to refresh the AI quota after a call). */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, restore the session from a stored token (if any).
  useEffect(() => {
    let active = true;
    const token = tokenStore.get();

    const restore = token
      ? authApi
          .me(token)
          .then((me) => {
            if (active) setUser(me);
          })
          .catch(() => {
            // Token expired or invalid — drop it.
            tokenStore.clear();
          })
      : Promise.resolve();

    restore.finally(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const applyAuth = useCallback((res: AuthResponse) => {
    tokenStore.set(res.access_token);
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (input: LoginInput) => applyAuth(await authApi.login(input)),
    [applyAuth],
  );

  const register = useCallback(
    async (input: RegisterInput) => applyAuth(await authApi.register(input)),
    [applyAuth],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = tokenStore.get();
    if (!token) return;
    try {
      setUser(await authApi.me(token));
    } catch {
      // A failed refresh just leaves the current (stale) quota in place — the
      // next real request will surface a real auth error if the token died.
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
