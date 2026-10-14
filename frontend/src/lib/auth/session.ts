import "server-only";
import { cookies } from "next/headers";
import type { CurrentUser } from "./current-user";
import { SESSION_COOKIE } from "./roles";
import { isSessionToken, USER_COOKIE, USER_COOKIE_OPTIONS, sealUser, secureCookies } from "./user-cookie";

// The session itself lives in the backend's database. The browser only holds
// a random token in an httpOnly cookie on our own domain, which we copy from
// the API's login response and send back to the API on every server call.

const DEFAULT_MAX_AGE = 90 * 24 * 60 * 60; // the backend's session-ttl

export async function getSessionToken(): Promise<string | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return isSessionToken(token) ? token : undefined;
}

/** Finds the session token in the API's Set-Cookie headers. */
export function readSessionCookie(setCookies: string[]): { token: string; maxAge: number } | null {
  const header = setCookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!header) return null;

  const [pair, ...attributes] = header.split(";");
  const token = pair.slice(SESSION_COOKIE.length + 1).trim();
  if (!isSessionToken(token)) return null;

  const maxAgeAttr = attributes.map((a) => a.trim()).find((a) => a.toLowerCase().startsWith("max-age="));
  const maxAge = maxAgeAttr ? Number(maxAgeAttr.split("=")[1]) : NaN;
  return { token, maxAge: Number.isFinite(maxAge) && maxAge > 0 ? maxAge : DEFAULT_MAX_AGE };
}

export async function saveSession(session: { token: string; maxAge: number }): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true, // page JavaScript can't read it (XSS can't steal it)
    secure: secureCookies(), // HTTPS only on the live site
    sameSite: "lax", // not sent on cross-site form posts (CSRF)
    path: "/",
    maxAge: session.maxAge,
  });
}

/** Stores the /users/me answer as "userSession" (see user-cookie.ts). */
export async function saveUser(user: CurrentUser, sessionToken: string): Promise<void> {
  const sealed = await sealUser(user, sessionToken, Date.now());
  if (sealed) (await cookies()).set(USER_COOKIE, sealed, { ...USER_COOKIE_OPTIONS, secure: secureCookies() });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: SESSION_COOKIE, path: "/" });
  jar.delete({ name: USER_COOKIE, path: "/" });
}
