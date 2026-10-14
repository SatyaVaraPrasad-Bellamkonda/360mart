// The logged-in user ("userSession"), built ONLY from GET /users/me. That API
// is the single source of user details: when the backend adds fields
// (profile id, profile image…), add them to UserResponse (api-types.ts) and
// here, and every page and useAuth() gets them.
// Safe for client components (types and a pure function only).

import type { UserResponse } from "./api-types";
import { ROLE_FROM_API, type Role } from "./roles";

export type CurrentUser = {
  userId: string;
  role: Role; // decides what to SHOW; the backend enforces access
  name: string | null; // null until profile editing exists
  mobileNumber: string; // E.164
  email: string | null;
  mobileVerified: boolean;
  lastLoginAt: string | null; // ISO-8601 UTC
};

export function toCurrentUser(me: UserResponse | null | undefined): CurrentUser | null {
  const role = me ? ROLE_FROM_API[me.role] : undefined;
  if (!me || !role || typeof me.userId !== "string") return null;
  return {
    userId: me.userId,
    role,
    name: me.fullName,
    mobileNumber: me.mobileNumber,
    email: me.email,
    mobileVerified: me.mobileVerified,
    lastLoginAt: me.lastLoginAt,
  };
}
