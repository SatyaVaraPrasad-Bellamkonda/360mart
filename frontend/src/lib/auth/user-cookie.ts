// "userSession" storage, like the user kept in HttpSession and read by
// header.jsp. Our servers keep no memory between requests (Vercel may use a
// different machine each time), so the /users/me answer is stored in a cookie
// the browser just carries back:
//   - encrypted + signed (AES-256-GCM with SESSION_SECRET): unreadable and unforgeable
//   - httpOnly: page JavaScript can't touch it
//   - bound to the session token: useless with any other session
//   - refreshed from /users/me every USER_REFRESH_MS by proxy.ts
// Used by proxy.ts too, so no next/headers and no "server-only" here.

import type { CurrentUser } from "./current-user";

export const USER_COOKIE = "MART360_USER";
export const USER_REFRESH_MS = 15 * 60 * 1000;

type Sealed = { u: CurrentUser; s: string; t: number }; // user, session fingerprint, fetched at

export type StoredUser = { user: CurrentUser; fetchedAt: number; fresh: boolean };

let keyPromise: Promise<CryptoKey> | null = null;
let warned = false;

// Null (feature off, pages fall back to calling /users/me) if the secret is missing.
function key(): Promise<CryptoKey> | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (!warned) {
      console.error("[auth] SESSION_SECRET is missing or shorter than 32 characters; user details won't be stored.");
      warned = true;
    }
    return null;
  }
  keyPromise ??= crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(secret))
    .then((raw) => crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]));
  return keyPromise;
}

export async function sealUser(user: CurrentUser, sessionToken: string, fetchedAt: number): Promise<string | null> {
  const k = await key();
  if (!k) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body: Sealed = { u: user, s: await fingerprint(sessionToken), t: fetchedAt };
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(JSON.stringify(body)));
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

export async function openUser(value: string | undefined, sessionToken: string, now: number): Promise<StoredUser | null> {
  const k = await key();
  if (!value || !k) return null;
  try {
    const [iv, data] = value.split(".");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64Url(iv) }, k, fromBase64Url(data));
    const body = JSON.parse(new TextDecoder().decode(plain)) as Sealed;
    // Belongs to a different (older) session: ignore it.
    if (body.s !== (await fingerprint(sessionToken))) return null;
    return { user: body.u, fetchedAt: body.t, fresh: now - body.t < USER_REFRESH_MS && body.t <= now };
  } catch {
    return null; // tampered, truncated or encrypted with another secret
  }
}

// The backend issues 32 random bytes, base64url-encoded (43 characters).
export function isSessionToken(token: string | undefined): token is string {
  return !!token && /^[A-Za-z0-9_-]{20,256}$/.test(token);
}

export const USER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 90 * 24 * 60 * 60, // same as the session; the content itself is refreshed every 15 minutes
};

export function secureCookies(): boolean {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE !== "false";
  return process.env.NODE_ENV === "production";
}

async function fingerprint(token: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toBase64Url(new Uint8Array(hash)).slice(0, 22);
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(text, "base64url"));
}
