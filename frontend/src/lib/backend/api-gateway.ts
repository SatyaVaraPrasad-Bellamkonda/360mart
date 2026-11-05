import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/roles";
import { isIP } from "node:net";
import { apiBaseUrl, proxySecret } from "./config";

// The public API door: https://360mart.in/api/v1/... is forwarded (rewritten
// by proxy.ts) to the Spring Boot API, so the browser calls the API itself and
// every call shows in DevTools → Network, while the backend's own address
// stays private. Security is enforced here, before anything is forwarded:
//
// 1. CSRF: a request that changes something (POST/PUT/PATCH/DELETE) must
//    carry `X-Client` (web/app) and, when the browser sends an Origin, come
//    from this site. Other websites can't add a custom header without a CORS
//    preflight, and this door never answers one, so they can't act with a
//    shopper's login cookie.
// 2. Only the session cookie goes on (not the encrypted user cookie or any
//    other), and headers a caller could use to pose as us (the proxy secret,
//    forwarded IPs, internal ones) are replaced, never passed through.
// 3. The shopper's real IP goes on in X-Forwarded-For, signed by the shared
//    proxy secret (API_PROXY_SECRET): the backend trusts it only with that.

export const API_PREFIX = "/api/v1";
export const CLIENT_HEADER = "x-client";
const CLIENTS = new Set(["web", "app"]);
const CHANGES = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const METHODS = new Set(["GET", "HEAD", ...CHANGES]);

// Request headers worth passing on; everything else is dropped.
const PASS = ["accept", "accept-language", "content-type", "content-length", "user-agent", "if-none-match", "if-modified-since", CLIENT_HEADER, "idempotency-key"];

export const isApiPath = (pathname: string) => pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`);

export function forwardApi(request: NextRequest, requestId: string): NextResponse {
  const method = request.method.toUpperCase();
  // No CORS: this door is for this site (and the app). A cross-site preflight gets no permission.
  if (method === "OPTIONS") return problem(403, "CORS_NOT_ALLOWED", "Cross-site requests aren't allowed.", requestId);
  if (!METHODS.has(method)) return problem(405, "METHOD_NOT_ALLOWED", "This method isn't allowed.", requestId);

  if (CHANGES.has(method)) {
    const client = request.headers.get(CLIENT_HEADER)?.toLowerCase() ?? "";
    if (!CLIENTS.has(client)) return problem(403, "CSRF_REJECTED", "This request didn't come from the 360mart website or app.", requestId);
    if (!sameSite(request)) return problem(403, "CSRF_REJECTED", "This request came from another website.", requestId);
  }

  const base = apiBaseUrl();
  if (!base) return problem(503, "API_UNAVAILABLE", "We couldn't connect to 360mart right now. Please try again in a moment.", requestId);
  const target = new URL(`${base}${request.nextUrl.pathname.slice(API_PREFIX.length)}${request.nextUrl.search}`);

  const headers = new Headers();
  for (const name of PASS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  const ip = clientIp(request.headers);
  if (ip) headers.set("x-forwarded-for", ip);
  headers.set("x-request-id", requestId);
  const secret = proxySecret();
  if (secret) headers.set("x-proxy-secret", secret);

  const response = NextResponse.rewrite(target, { request: { headers } });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

/**
 * The browser's Origin (sent with every POST/PUT/PATCH/DELETE fetch) must be
 * this site, and Sec-Fetch-Site must not say "cross-site". The app sends
 * neither, so a missing Origin passes (it still needs X-Client).
 */
function sameSite(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}

/**
 * The shopper's IP. Only on Vercel, which overwrites x-real-ip /
 * x-forwarded-for itself so callers can't forge them; anywhere else (a laptop,
 * a plain `next start`) these headers come from the caller, so none is sent
 * and the backend sees this server's address instead.
 */
export function clientIp(incoming: Headers): string | null {
  if (!process.env.VERCEL) return null;
  const ip = (incoming.get("x-real-ip") ?? incoming.get("x-forwarded-for")?.split(",")[0])?.trim();
  return ip && isIP(ip) ? ip : null;
}

function problem(status: number, code: string, detail: string, requestId: string): NextResponse {
  return NextResponse.json(
    { status, code, detail, title: code },
    { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store", "X-Request-Id": requestId } },
  );
}
