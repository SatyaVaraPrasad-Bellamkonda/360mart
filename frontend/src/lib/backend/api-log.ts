import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inspect } from "node:util";
// Next's per-render store (internal, no public API). Used only to name the
// route a cached call was made for; any change in Next just drops that detail.
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external";

// Development log of every backend call: who made it (page, navigation,
// prefetch, server action by name, route handler, cache), what was sent and
// what came back, with passwords, OTPs, tokens, phone numbers and coordinates
// masked. Printed in the terminal and mirrored to the browser console (and the
// Network tab's EventStream) by <BackendCallConsole> through
// /api/dev/backend-calls. Production keeps only the 5xx lines in callApi.
//
// API_LOG (env): "full" (default in dev) = request + response, "basic" = one
// line per call, "off". Ignored in production: bodies are never logged there.

export type ApiLogMode = "off" | "basic" | "full";

export function apiLogMode(): ApiLogMode {
  if (process.env.NODE_ENV !== "development") return "off";
  const mode = process.env.API_LOG?.trim().toLowerCase();
  return mode === "off" || mode === "basic" ? mode : "full";
}

export type ApiCall = {
  seq: number;
  at: string; // ISO time
  requestId: string; // "-" = no visitor (a cached, shared call)
  origin: string; // e.g. "page GET /fruits", "action uploadPriceSheetAction (…)"
  method: string;
  path: string; // query values masked
  status: number; // 0 = backend unreachable
  ms: number;
  errorCode?: string;
  failed?: string; // network error message
  request?: unknown;
  response?: unknown;
};

// Set by proxy.ts (development only), read here for the "origin".
export const ORIGIN_HEADER = "x-mart-origin";

// ---- masking ----

const MASK = "•••";
const norm = (key: string) => key.toLowerCase().replace(/[^a-z]/g, "");
const SECRET = /password|otp|token|secret|cookie|authorization|signature/;
const PHONE = new Set(["mobile", "mobilenumber", "phone", "phonenumber", "alternatephone", "contactnumber", "alternatemobile"]);
const PLACE = new Set(["latitude", "longitude", "lat", "lng", "lon"]);

function maskValue(key: string, value: unknown): unknown {
  const k = norm(key);
  if (value === null || value === undefined) return value;
  // otpId is only a handle, not the code: keep it so the flow can be followed.
  if (SECRET.test(k) && k !== "otpid" && typeof value !== "object") return MASK;
  if (PHONE.has(k) && (typeof value === "string" || typeof value === "number")) return `${MASK}${String(value).slice(-4)}`;
  if (PLACE.has(k) && typeof value !== "object") return MASK;
  return mask(value);
}

/** A copy with secrets and personal data masked (also inside signed links). */
export function mask(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/([?&](?:token|signature|sig|x-amz-signature|x-amz-credential)=)[^&\s"]+/gi, `$1${MASK}`);
  if (Array.isArray(value)) return value.map(mask);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskValue(k, v)]));
  return value;
}

/** The path with masked query values (e.g. latitude=•••). */
export function maskPath(path: string): string {
  const q = path.indexOf("?");
  if (q < 0) return path;
  const params = new URLSearchParams(path.slice(q + 1));
  const parts = [...params].map(([k, v]) => `${k}=${String(maskValue(k, v))}`);
  return `${path.slice(0, q)}?${parts.join("&")}`;
}

/** What a request body looks like, masked: JSON as is, FormData field by field. */
export async function describeBody(body: unknown): Promise<unknown> {
  if (body === undefined) return undefined;
  if (!(body instanceof FormData)) return mask(body);
  const out: Record<string, unknown> = {};
  for (const [key, value] of body) {
    if (typeof value === "string") out[key] = maskValue(key, value);
    else if (value.type === "application/json") {
      // A JSON part (e.g. "product" next to its picture).
      try {
        out[key] = mask(JSON.parse(await value.text()));
      } catch {
        out[key] = "(unreadable JSON part)";
      }
    } else out[key] = `file ${value instanceof File ? `"${value.name}" ` : ""}${value.type || "unknown type"}, ${formatBytes(value.size)}`;
  }
  return out;
}

function formatBytes(n: number) {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// ---- who made the call ----

/** "page GET /fruits", "action saveListingAction (src/lib/…)", "prefetch …", "cached …". */
export function describeOrigin(incoming: Headers, requestId: string): string {
  const origin = incoming.get(ORIGIN_HEADER);
  if (!origin) return requestId === "-" ? cachedOrigin() : "server";
  if (origin.startsWith("session refresh")) return origin;
  const actionId = incoming.get("next-action");
  if (actionId) return `action ${actionName(actionId) ?? actionId.slice(0, 10)} on ${origin.replace(/^\S+ /, "")}`;
  if (incoming.get("next-router-prefetch")) return `prefetch ${origin}`;
  if (incoming.get("rsc")) return `navigation ${origin}`;
  return origin;
}

// A "use cache" function has no visitor (its answer is shared by everyone), so
// no request id: name the route it was rendering instead.
function cachedOrigin(): string {
  let route: string | undefined;
  try {
    route = workAsyncStorage.getStore()?.route;
  } catch {
    // Next internals moved: leave the route out
  }
  return `cached${route ? ` while rendering ${route}` : ""}: shared by every visitor, reused until it expires`;
}

/**
 * One line per incoming request, with the id its backend calls carry, so the
 * [api] lines under it can be matched to it (proxy.ts, development only).
 */
export function logIncoming(requestId: string, request: { method: string; pathname: string; headers: Headers }): void {
  if (apiLogMode() === "off" || request.pathname.startsWith("/api/dev/")) return;
  const h = request.headers;
  const kind = h.get("next-action") ? "server action" : h.get("next-router-prefetch") ? "prefetch" : h.get("rsc") ? "navigation" : request.method === "GET" ? "page" : "request";
  const color = process.stdout.isTTY;
  const paint = (code: number, text: string) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
  process.stdout.write(`${paint(35, "[req]")} ${time} ${paint(1, `${request.method} ${request.pathname}`)}  ${paint(2, `· ${kind} · req ${requestId}`)}\n`);
}

// Server action ids → "name (file)", from the dev build's manifest. Read again
// (at most every 2 s) when an id is missing, since new actions appear as pages compile.
let actions: Record<string, { exportedName?: string; filename?: string }> = {};
let actionsReadAt = 0;
function actionName(id: string): string | null {
  if (!actions[id] && Date.now() - actionsReadAt > 2000) {
    actionsReadAt = Date.now();
    try {
      const file = join(/* turbopackIgnore: true */ process.cwd(), ".next", "dev", "server", "server-reference-manifest.json");
      actions = (JSON.parse(readFileSync(file, "utf8")) as { node?: typeof actions }).node ?? {};
    } catch {
      actions = {};
    }
  }
  const entry = actions[id];
  return entry?.exportedName ? `${entry.exportedName}${entry.filename ? ` (${entry.filename})` : ""}` : null;
}

// ---- output ----

type Bus = { seq: number; recent: ApiCall[]; listeners: Set<(call: ApiCall) => void> };
// On globalThis: proxy.ts, pages and route handlers may load separate copies
// of this module in the dev server, but they share one process.
const bus: Bus = ((globalThis as { __martApiLog?: Bus }).__martApiLog ??= { seq: 0, recent: [], listeners: new Set() });
const KEEP = 100;
const MAX_BROWSER_CHARS = 500_000;

export function recentCalls(since: number): ApiCall[] {
  return bus.recent.filter((c) => c.seq > since);
}

export function onApiCall(listener: (call: ApiCall) => void): () => void {
  bus.listeners.add(listener);
  return () => bus.listeners.delete(listener);
}

/** Prints the call and passes it to open browser consoles. Development only. */
export function logApiCall(entry: Omit<ApiCall, "seq" | "at">, mode: ApiLogMode): void {
  if (mode === "off") return;
  const call: ApiCall = { ...entry, seq: ++bus.seq, at: new Date().toISOString() };

  // process.stdout, not console: Next replays console output of cached
  // functions on every reuse (the " Cache " lines), which read like new calls.
  // A line here means the backend really was called.
  const color = process.stdout.isTTY;
  const paint = (code: number, text: string) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
  const time = new Date(call.at).toLocaleTimeString("en-GB", { hour12: false });
  const outcome = call.failed ? paint(31, `failed: ${call.failed}`) : paint(call.status >= 400 ? 31 : 32, `${call.status}${call.errorCode ? ` ${call.errorCode}` : ""}`);
  const req = call.requestId === "-" ? "" : ` · req ${call.requestId}`;
  const head = `${paint(36, "[api]")} ${time} ${paint(1, `${call.method} ${call.path}`)} → ${outcome} in ${call.ms}ms  ${paint(2, `· ${call.origin}${req}`)}`;
  let text = head;
  if (mode === "full") {
    const show = (label: string, value: unknown) =>
      `\n      ${paint(2, label)} ${inspect(value, { depth: 3, maxArrayLength: 3, maxStringLength: 120, breakLength: 120, compact: 3, colors: color }).replaceAll("\n", "\n      ")}`;
    if (call.request !== undefined) text += show("request ", call.request);
    if (call.response !== undefined && call.response !== null) text += show("response", call.response);
  }
  process.stdout.write(`${text}\n`);

  // Very large answers are cut for the browser (the terminal shows a summary anyway).
  const forBrowser = JSON.stringify(call.response ?? null).length > MAX_BROWSER_CHARS ? { ...call, response: "(too large to show here)" } : call;
  bus.recent.push(forBrowser);
  if (bus.recent.length > KEEP) bus.recent.shift();
  for (const listener of bus.listeners) listener(forBrowser);
}
