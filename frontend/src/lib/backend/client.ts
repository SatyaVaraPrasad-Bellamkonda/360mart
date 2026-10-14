import "server-only";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import type { ApiProblem } from "@/lib/auth/api-types";
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
  method?: "GET" | "POST";
  body?: unknown;
  sessionToken?: string; // sent as the MART360_SESSION cookie
  // The shopper's request. Defaults to headers() from next/headers; proxy.ts,
  // where that isn't available, passes request.headers instead.
  incoming?: Headers;
};

const TIMEOUT_MS = 10_000;

// Set by proxy.ts on every request; forwarded to Spring Boot and printed in
// the [api] lines, so a browser request can be matched to its backend calls.
export const REQUEST_ID_HEADER = "x-request-id";

const GENERIC = "Something went wrong. Please try again.";
const UNREACHABLE = "We couldn't connect to 360mart right now. Please try again in a moment.";

export async function callApi<T>(path: string, { method = "GET", body, sessionToken, incoming }: Options = {}): Promise<ApiResult<T>> {
  const base = apiBaseUrl();
  if (!base) return failure(0, "API_UNAVAILABLE", UNREACHABLE);

  const requestHeaders = new Headers({ Accept: "application/json" });
  if (body !== undefined) requestHeaders.set("Content-Type", "application/json");
  if (sessionToken) requestHeaders.set("Cookie", `${SESSION_COOKIE}=${sessionToken}`);
  const source = incoming ?? (await headers());
  forwardClientDetails(source, requestHeaders);
  const requestId = source.get(REQUEST_ID_HEADER) ?? "-";
  if (requestId !== "-") requestHeaders.set("X-Request-Id", requestId);
  const label = `[api] ${requestId} ${method} ${path}`;

  const started = performance.now(); // not Date.now(): Next.js rejects it while prerendering
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      // Never follow a redirect: it could carry the session cookie to another host.
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    // Next.js cancels in-flight requests on purpose while prerendering; let it.
    unstable_rethrow(error);
    // Log the reason only, never the body (it may hold a password or code).
    console.error(`${label} failed: ${error instanceof Error ? error.message : String(error)}`);
    return failure(0, "API_UNAVAILABLE", UNREACHABLE);
  }

  const payload = await readJson(response);
  const result: ApiResult<T> = response.ok
    ? { ok: true, status: response.status, data: payload as T, setCookies: response.headers.getSetCookie() }
    : { ok: false, error: toFailure(response.status, payload) };

  // The browser only sees calls to our own site (the BFF design), so show each
  // backend call here: in development always, in production only failures.
  // Status and error code only, never a body (it can hold a password or code).
  const line = `${label} → ${response.status}${result.ok ? "" : ` ${result.error.code}`} in ${Math.round(performance.now() - started)}ms`;
  if (response.status >= 500) console.error(line);
  else if (process.env.NODE_ENV === "development") console.log(line);
  return result;
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
