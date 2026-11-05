// The browser's way to call the 360mart API (like an AngularJS $http service).
// Requests go to this site's own /api/v1/... (proxy.ts checks and forwards
// them to Spring Boot), so each one shows in DevTools → Network. The login
// cookie is httpOnly and travels by itself; this code never sees it.
//
// Every call answers in the shape the screens already use for server
// actions: { ok: true, data } or { ok: false, error: { code, message,
// fieldErrors } }, so error handling doesn't change (UNAUTHENTICATED →
// sessionExpired(), VALIDATION_FAILED → fieldErrors under the fields, …).
// Safe for client components only to *call*; it holds no secrets.

export type ApiError = {
  status: number; // 0 = no answer (offline, server down)
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
  /** Every errors[] item in order (several can share a field). */
  issues: { field: string; message: string }[];
};
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON, or FormData for uploads. */
  body?: unknown;
  signal?: AbortSignal;
  /** Let the request finish even if the page is left (e.g. "opened" right before following a link). */
  keepalive?: boolean;
};

const GENERIC = "Something went wrong. Please try again.";
const OFFLINE = "We couldn't connect to 360mart right now. Please try again in a moment.";

/** Calls GET/POST/… /api/v1{path}. `path` starts with "/", e.g. "/cart" or `/orders/${id}`. */
export async function api<T>(path: string, { method = "GET", body, signal, keepalive }: Options = {}): Promise<ApiResult<T>> {
  const isForm = body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json", "X-Client": "web" };
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
      signal,
      keepalive,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return failure(0, "ABORTED", "Cancelled.");
    return failure(0, "API_UNAVAILABLE", OFFLINE);
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => undefined);
  if (response.ok) return { ok: true, data: payload as T };
  // Not JSON at all (a proxy or gateway page): the API couldn't be reached.
  if (payload === undefined) return failure(response.status, "API_UNAVAILABLE", OFFLINE);
  return { ok: false, error: toError(response.status, payload) };
}

function toError(status: number, payload: unknown): ApiError {
  const p = (payload && typeof payload === "object" ? payload : {}) as { code?: unknown; detail?: unknown; errors?: unknown };
  const fieldErrors: Record<string, string> = {};
  const issues: { field: string; message: string }[] = [];
  for (const item of Array.isArray(p.errors) ? p.errors : []) {
    if (typeof item?.field !== "string" || typeof item?.message !== "string") continue;
    fieldErrors[item.field] ??= item.message;
    issues.push({ field: item.field, message: item.message });
  }
  const code = typeof p.code === "string" ? p.code : status === 401 ? "UNAUTHENTICATED" : "UNKNOWN";
  const message = code === "UNAUTHENTICATED" ? "Please log in again to continue." : typeof p.detail === "string" && p.detail ? p.detail : GENERIC;
  return { status, code, message, fieldErrors, issues };
}

function failure(status: number, code: string, message: string): { ok: false; error: ApiError } {
  return { ok: false, error: { status, code, message, fieldErrors: {}, issues: [] } };
}
