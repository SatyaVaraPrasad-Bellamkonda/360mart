import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./roles";
import { SESSION_MAX_AGE, signSession, verifySession, type SessionPayload } from "./token";

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // browser JavaScript can't read it
    secure: process.env.NODE_ENV === "production", // https only on the live site
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE[payload.role],
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
