import "server-only";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type { ApiProblem } from "@/lib/auth/api-types";
import { apiLogMode, describeBody, describeOrigin, logApiCall, mask, maskPath } from "./api-log";
import { SESSION_COOKIE } from "@/lib/auth/roles";
import { apiBaseUrl } from "./config";

// The only way the website talks to the Spring Boot API. It runs on our
// Next.js server (never in the browser), so the API address stays private and
// the session cookie is never readable by page JavaScript.

export type ApiFailure = {
  status: number; // 0 = the API could not be reached
  code: string; // stable code to branch on, e.g. "OTP_INVALID"
  message: string; // safe to show to the user
  fieldErrors: Record<string, string>; // VALIDATION_FAILED: field → message
};

export type ApiResult<T> =
  | { ok: true; status: number; data: T; setCookies: string[] }
  | { ok: false; error: ApiFailure };

type Options = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown; // JSON-encoded, or sent as-is when it's FormData (file uploads)
  sessionToken?: string; // sent as the MART360_SESSION cookie
  // The shopper's request. Defaults to headers() from next/headers; proxy.ts,
  // where that isn't available, passes request.headers instead.
  incoming?: Headers;
};

const TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 30_000; // slow mobile uplinks

// Set by proxy.ts on every request; forwarded to Spring Boot and printed in
// the [api] lines, so a browser request can be matched to its backend calls.
export const REQUEST_ID_HEADER = "x-request-id";

const GENERIC = "Something went wrong. Please try again.";
const UNREACHABLE = "We couldn't connect to 360mart right now. Please try again in a moment.";

export async function callApi<T>(path: string, { method = "GET", body, sessionToken, incoming }: Options = {}): Promise<ApiResult<T>> {
  const base = apiBaseUrl();
  if (!base) return failure(0, "API_UNAVAILABLE", UNREACHABLE);

  const requestHeaders = new Headers({ Accept: "application/json" });
  const isUpload = body instanceof FormData;
  // FormData: fetch sets "multipart/form-data; boundary=…" itself.
  if (body !== undefined && !isUpload) requestHeaders.set("Content-Type", "application/json");
  if (sessionToken) requestHeaders.set("Cookie", `${SESSION_COOKIE}=${sessionToken}`);
  const source = incoming ?? (await headers());
  forwardClientDetails(source, requestHeaders);
  const requestId = source.get(REQUEST_ID_HEADER) ?? "-";
  if (requestId !== "-") requestHeaders.set("X-Request-Id", requestId);
  const label = `[api] ${requestId} ${method} ${maskPath(path)}`;

  const started = performance.now(); // not Date.now(): Next.js rejects it while prerendering
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : isUpload ? body : JSON.stringify(body),
      cache: "no-store",
      // Never follow a redirect: it could carry the session cookie to another host.
      redirect: "error",
      signal: AbortSignal.timeout(isUpload ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS),
    });
  } catch (error) {
    // Next.js cancels in-flight requests on purpose while prerendering; let it.
    unstable_rethrow(error);
    // Log the reason only, never the body (it may hold a password or code).
    const reason = error instanceof Error ? error.message : String(error);
    const mode = apiLogMode();
    if (mode === "off") console.error(`${label} failed: ${reason}`);
    else logApiCall({ requestId, origin: describeOrigin(source, requestId), method, path: maskPath(path), status: 0, ms: Math.round(performance.now() - started), failed: reason, request: mode === "full" ? await describeBody(body) : undefined }, mode);
    return failure(0, "API_UNAVAILABLE", UNREACHABLE);
  }

  const payload = await readJson(response);
  const result: ApiResult<T> = response.ok
    ? { ok: true, status: response.status, data: payload as T, setCookies: response.headers.getSetCookie() }
    : { ok: false, error: toFailure(response.status, payload) };

  // The browser only sees calls to our own site (the BFF design), so show each
  // backend call here. Development: api-log.ts (masked request + response).
  // Production: only failures, status and error code, never a body.
  const ms = Math.round(performance.now() - started);
  const mode = apiLogMode();
  if (mode !== "off") {
    const full = mode === "full";
    logApiCall({ requestId, origin: describeOrigin(source, requestId), method, path: maskPath(path), status: response.status, ms, errorCode: result.ok ? undefined : result.error.code, request: full ? await describeBody(body) : undefined, response: full ? mask(payload) : undefined }, mode);
  } else if (response.status >= 500) console.error(`${label} → ${response.status}${result.ok ? "" : ` ${result.error.code}`} in ${ms}ms`);
  return result;
}

/**
 * A file from the API (e.g. the price sheet), for a route handler to pass on
 * to the browser as it streams. Errors still come back as ApiFailure (the API
 * answers them in JSON). Same headers, request id and logging as callApi.
 */
export async function callApiFile(path: string, { sessionToken }: { sessionToken: string }): Promise<{ ok: true; response: Response } | { ok: false; error: ApiFailure }> {
  const base = apiBaseUrl();
  if (!base) return failure(0, "API_UNAVAILABLE", UNREACHABLE);
  const requestHeaders = new Headers({ Accept: "*/*", Cookie: `${SESSION_COOKIE}=${sessionToken}` });
  const source = await headers();
  forwardClientDetails(source, requestHeaders);
  const requestId = source.get(REQUEST_ID_HEADER) ?? "-";
  if (requestId !== "-") requestHeaders.set("X-Request-Id", requestId);
  const label = `[api] ${requestId} GET ${maskPath(path)}`;
  const started = performance.now();
  let response: Response;
  try {
    // A big sheet takes a while to build: the upload timeout, not the short one.
    response = await fetch(`${base}${path}`, { headers: requestHeaders, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS) });
  } catch (error) {
    unstable_rethrow(error);
    const reason = error instanceof Error ? error.message : String(error);
    const mode = apiLogMode();
    if (mode === "off") console.error(`${label} failed: ${reason}`);
    else logApiCall({ requestId, origin: describeOrigin(source, requestId), method: "GET", path: maskPath(path), status: 0, ms: Math.round(performance.now() - started), failed: reason }, mode);
    return failure(0, "API_UNAVAILABLE", UNREACHABLE);
  }
  const ms = Math.round(performance.now() - started);
  const payload = response.ok ? null : await readJson(response);
  const error = response.ok ? null : toFailure(response.status, payload);
  const mode = apiLogMode();
  if (mode !== "off") {
    // The file itself streams on to the browser untouched: log what it is, not its bytes.
    const file = { type: response.headers.get("content-type"), name: response.headers.get("content-disposition"), size: response.headers.get("content-length") };
    logApiCall({ requestId, origin: describeOrigin(source, requestId), method: "GET", path: maskPath(path), status: response.status, ms, errorCode: error?.code, response: mode === "full" ? (error ? mask(payload) : { file }) : undefined }, mode);
  } else if (response.status >= 500) console.error(`${label} → ${response.status} in ${ms}ms`);
  if (error) return { ok: false, error };
  return { ok: true, response };
}

// The API rate-limits per IP and lists each session's device, so it needs the
// shopper's IP and browser, not our server's. Vercel sets x-real-ip /
// x-forwarded-for itself; the backend only trusts X-Forwarded-For from known
// proxy addresses (server.forward-headers-strategy).
function forwardClientDetails(incoming: Headers, target: Headers): void {
  const userAgent = incoming.get("user-agent");
  if (userAgent) target.set("User-Agent", userAgent.slice(0, 255));

  const ip = (incoming.get("x-real-ip") ?? incoming.get("x-forwarded-for")?.split(",")[0])?.trim();
  if (ip && isIP(ip)) target.set("X-Forwarded-For", ip);
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toFailure(status: number, payload: unknown): ApiFailure {
  const problem = (payload && typeof payload === "object" ? payload : {}) as Partial<ApiProblem>;
  // No code = the request itself was malformed (our bug, not the user's).
  if (typeof problem.code !== "string") return failure(status, "UNKNOWN", GENERIC).error;

  const fieldErrors: Record<string, string> = {};
  for (const item of Array.isArray(problem.errors) ? problem.errors : []) {
    if (typeof item?.field === "string" && typeof item.message === "string") fieldErrors[item.field] ??= item.message;
  }
  const message = typeof problem.detail === "string" && problem.detail ? problem.detail : GENERIC;
  return { status, code: problem.code, message, fieldErrors };
}

function failure(status: number, code: string, message: string): { ok: false; error: ApiFailure } {
  return { ok: false, error: { status, code, message, fieldErrors: {} } };
}
