import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./roles";

// The session itself lives in the backend's database. The browser only holds
// a random token in an httpOnly cookie on our own domain, which we copy from
// the API's login response and send back to the API on every server call.

// The backend issues 32 random bytes, base64url-encoded (43 characters).
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,256}$/;

const DEFAULT_MAX_AGE = 90 * 24 * 60 * 60; // the backend's session-ttl

export async function getSessionToken(): Promise<string | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token && TOKEN_SHAPE.test(token) ? token : undefined;
}

/** Finds the session token in the API's Set-Cookie headers. */
export function readSessionCookie(setCookies: string[]): { token: string; maxAge: number } | null {
  const header = setCookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!header) return null;

  const [pair, ...attributes] = header.split(";");
  const token = pair.slice(SESSION_COOKIE.length + 1).trim();
  if (!TOKEN_SHAPE.test(token)) return null;

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

export async function clearSession(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
}

// COOKIE_SECURE=false allows testing a production build over plain http.
function secureCookies(): boolean {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE !== "false";
  return process.env.NODE_ENV === "production";
}
