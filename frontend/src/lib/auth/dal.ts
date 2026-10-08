import "server-only";
import { redirect } from "next/navigation";
import { ROLE_LOGIN, type Role } from "./roles";
import { getSession } from "./session";
import type { SessionPayload } from "./token";

// The one place pages check who is logged in. The proxy only does a quick
// pre-check; protected pages must still call requireRole().

export async function getCurrentUser(): Promise<SessionPayload | null> {
  return getSession();
}

export async function requireRole(role: Role): Promise<SessionPayload> {
  const user = await getSession();
  if (!user || user.role !== role) redirect(ROLE_LOGIN[role]);
  return user;
}
