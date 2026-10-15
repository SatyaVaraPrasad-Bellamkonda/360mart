// The logged-in user ("userSession"), built ONLY from GET /users/me (or the
// profile update, which returns the same shape). That API is the single source
// of user details: when the backend adds fields, add them to UserResponse
// (api-types.ts) and here, and every page and useAuth() gets them.
// Safe for client components (types and pure functions only).

import type { UserResponse } from "./api-types";
import { ROLE_FROM_API, type Role } from "./roles";

export type CurrentUser = {
  userId: string;
  role: Role; // decides what to SHOW; the backend enforces access
  firstName: string | null; // null until the user fills in their profile
  lastName: string | null;
  mobileNumber: string; // E.164
  email: string | null;
  profileImageUrl: string | null; // signed link (~1 hour); never store it anywhere else
  mobileVerified: boolean;
  lastLoginAt: string | null; // ISO-8601 UTC
};

export function toCurrentUser(me: UserResponse | null | undefined): CurrentUser | null {
  const role = me ? ROLE_FROM_API[me.role] : undefined;
  if (!me || !role || typeof me.userId !== "string") return null;
  return {
    userId: me.userId,
    role,
    firstName: me.firstName ?? null,
    lastName: me.lastName ?? null,
    mobileNumber: me.mobileNumber,
    email: me.email ?? null,
    profileImageUrl: me.profileImageUrl ?? null,
    mobileVerified: me.mobileVerified,
    lastLoginAt: me.lastLoginAt ?? null,
  };
}

/** "Ravi Kumar", "Ravi", or null when no name has been entered yet. */
export function fullName(user: Pick<CurrentUser, "firstName" | "lastName">): string | null {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
}

/** "RK" / "R" for the avatar placeholder, or null. */
export function initials(user: Pick<CurrentUser, "firstName" | "lastName">): string | null {
  // Array.from takes whole characters, never half of a surrogate pair.
  const letters = [user.firstName, user.lastName].map((part) => Array.from(part?.trim() ?? "")[0] ?? "").join("");
  return letters ? letters.toLocaleUpperCase() : null;
}
