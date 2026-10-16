"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CurrentUser } from "@/lib/auth/current-user";
import { ROLE_LOGIN } from "@/lib/auth/roles";

// Who is logged in, for client components (like an AngularJS authService you
// inject anywhere): const { user, status } = useAuth().
//
// The browser never asks the backend itself. The server loads the user from
// /users/me once at login and stores it ("userSession", see
// lib/auth/user-cookie.ts); <AuthSync> hands it over on every page, so there
// is no browser request and no "logged out" flash. Login and logout re-render the page on the server,
// which syncs the new user automatically.
//
// Never base security on this: the role only decides what to show. The
// backend checks every request.

export type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: CurrentUser | null;
  status: AuthStatus;
  /** Call when an action reports UNAUTHENTICATED: the session ended, so log in again. */
  sessionExpired: () => void;
  /** Use the user returned by a profile action straight away (the server copy is already updated). */
  replaceUser: (user: CurrentUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SetUserContext = createContext<((user: CurrentUser | null) => void) | null>(null);

declare global {
  interface Window {
    /** Development only: the current user, for inspecting in the browser console. */
    userSession?: CurrentUser | null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const router = useRouter();

  const setUser = useCallback((next: CurrentUser | null) => {
    setUserState(next);
    setStatus(next ? "authenticated" : "anonymous");
  }, []);

  const sessionExpired = useCallback(() => {
    setUser(null);
    const area = user?.role ?? "customer";
    // Read the URL only now: usePathname() in this app-wide provider would make
    // every page with a URL parameter (e.g. an address id) wait for the request.
    router.push(`${ROLE_LOGIN[area]}?next=${encodeURIComponent(window.location.pathname)}`);
  }, [router, setUser, user?.role]);

  // Development only, as the backend guide suggests: type `userSession` in the console.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && status !== "loading") window.userSession = user;
  }, [user, status]);

  const value = useMemo(() => ({ user, status, sessionExpired, replaceUser: setUser }), [user, status, sessionExpired, setUser]);

  return (
    <SetUserContext value={setUser}>
      <AuthContext value={value}>{children}</AuthContext>
    </SetUserContext>
  );
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth() must be used inside <AuthProvider>");
  return value;
}

/** True for an action error that means "your session has ended". */
export function isUnauthenticated(error: { code: string } | null | undefined): boolean {
  return error?.code === "UNAUTHENTICATED";
}

// Rendered by the server (inside the header's <Suspense>) with the user it
// already fetched; copies it into the provider. Renders nothing.
export function AuthSync({ user }: { user: CurrentUser | null }) {
  const setUser = use(SetUserContext);
  useEffect(() => {
    setUser?.(user);
  }, [setUser, user]);
  return null;
}
