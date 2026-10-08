// Signs and verifies the session token stored in the cookie. Used by both the
// proxy and server code, so it must not import next/headers.

import { jwtVerify, SignJWT } from "jose";
import type { Role } from "./roles";

export type SessionPayload = {
  userId: string;
  role: Role;
  displayName: string; // short label for the header, never a full phone or email
};

// Admins get short sessions; customers stay signed in longer.
export const SESSION_MAX_AGE: Record<Role, number> = {
  customer: 30 * 24 * 60 * 60,
  seller: 7 * 24 * 60 * 60,
  admin: 8 * 60 * 60,
};

function secretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? new TextEncoder().encode(secret) : null;
}

export function isSessionConfigured(): boolean {
  return secretKey() !== null;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("SESSION_SECRET is missing or shorter than 32 characters.");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE[payload.role]}s`)
    .sign(key);
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  const key = secretKey();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const { userId, role, displayName } = payload as Partial<SessionPayload>;
    if (typeof userId !== "string" || typeof displayName !== "string") return null;
    if (role !== "customer" && role !== "seller" && role !== "admin") return null;
    return { userId, role, displayName };
  } catch {
    return null; // expired, tampered or signed with another secret
  }
}
