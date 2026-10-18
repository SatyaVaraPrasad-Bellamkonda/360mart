import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getMe } from "./auth-service";
import { toCurrentUser, type CurrentUser } from "./current-user";
import { ROLE_LOGIN, type Role } from "./roles";
import { getSessionToken } from "./session";
import { openUser, USER_COOKIE } from "./user-cookie";

export type { CurrentUser } from "./current-user";

// The one place pages check who is logged in.
//
// Normal case: read "userSession", the /users/me answer stored at login and
// refreshed every 15 minutes by proxy.ts. No backend call.
// Fallback (cookie missing, e.g. SESSION_SECRET unset): ask /users/me live.
// Either way the backend still checks the real session on every API call;
// this only decides what the page shows.

// cache(): the header and the page share one answer per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  await connection(); // request-time only, so Date.now() below is allowed
  const stored = await openUser((await cookies()).get(USER_COOKIE)?.value, token, Date.now());
  if (stored?.fresh) return stored.user;

  const live = await getLiveUser(token);
  // Backend unreachable: keep showing the last known user rather than "logged out".
  return live === "unreachable" ? (stored?.user ?? null) : live;
});

async function getLiveUser(token: string): Promise<CurrentUser | null | "unreachable"> {
  const res = await getMe(token);
  if (res.ok) return toCurrentUser(res.data);
  return res.error.status === 0 || res.error.status >= 500 ? "unreachable" : null;
}

// One role, or several (SHOPPERS for the shopping account). Anyone else goes to
// the login of the first role listed. Admin pages always confirm with the
// backend (rare, and the most sensitive); other areas trust the stored copy.
export async function requireRole(role: Role | Role[]): Promise<CurrentUser> {
  const allowed = Array.isArray(role) ? role : [role];
  const user = allowed.includes("admin") ? await requireLiveAdmin() : await getCurrentUser();
  if (!user || !allowed.includes(user.role)) redirect(ROLE_LOGIN[allowed[0]]);
  return user;
}

// cache(): the admin layout and the page both check, with one backend call per request.
const requireLiveAdmin = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  const live = token ? await getLiveUser(token) : null;
  return live === "unreachable" ? null : live;
});
