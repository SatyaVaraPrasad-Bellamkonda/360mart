import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getMe } from "./auth-service";
import { ROLE_FROM_API, ROLE_LOGIN, type Role } from "./roles";
import { getSessionToken } from "./session";

// The one place pages check who is logged in. The cookie is only a random
// token; the backend decides whether it is still valid (not logged out,
// expired, revoked by a password reset, or the account disabled).

export type CurrentUser = {
  userId: string;
  role: Role;
  name: string | null; // null until profile editing exists
  mobileNumber: string; // E.164
};

// cache(): the header and the page can both ask, but the API is called once per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  const res = await getMe(token);
  const role = res.ok ? ROLE_FROM_API[res.data.role] : undefined;
  if (!res.ok || !role) return null;
  return { userId: res.data.userId, role, name: res.data.fullName, mobileNumber: res.data.mobileNumber };
});

export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== role) redirect(ROLE_LOGIN[role]);
  return user;
}
