import { NextResponse, type NextRequest } from "next/server";
import type { UserResponse } from "@/lib/auth/api-types";
import { toCurrentUser } from "@/lib/auth/current-user";
import { PROTECTED_AREAS, ROLE_LOGIN, SESSION_COOKIE } from "@/lib/auth/roles";
import { isSessionToken, openUser, sealUser, secureCookies, USER_COOKIE, USER_COOKIE_OPTIONS } from "@/lib/auth/user-cookie";
import { apiLogMode, logIncoming, ORIGIN_HEADER } from "@/lib/backend/api-log";
import { callApi, REQUEST_ID_HEADER } from "@/lib/backend/client";

// Runs before every page and server action (not images/scripts). Three jobs:
// 0. Stamp a request ID: sent to the browser as the X-Request-Id response
//    header and to Spring Boot with every backend call this request makes,
//    and printed in the [api] log lines. One ID ties them all together.
// 1. /account, /seller, /admin without a session cookie → that area's login.
// 2. Keep "userSession" fresh: if the stored /users/me answer is older than
//    15 minutes, fetch it again (role changes, suspensions and profile edits
//    show up). So /users/me runs at most once per 15 minutes per user, not
//    on every page view. A session the backend has ended is cleared here.
export async function proxy(request: NextRequest) {
  // Browser/tool probes like Chrome DevTools' /.well-known/appspecific/… would
  // otherwise render as a product page (3 segments) and call the backend.
  if (request.nextUrl.pathname.startsWith("/.well-known/")) return new NextResponse(null, { status: 404 });
  // Keep an ID already on the request: after a server action calls redirect(),
  // Next renders the target page with a second internal request that would
  // otherwise get a new ID. It's only a log label (not a permission), and the
  // strict format keeps anything else out of the logs.
  const existing = request.headers.get(REQUEST_ID_HEADER);
  const requestId = existing && /^[0-9a-f]{12}$/.test(existing) ? existing : crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  logIncoming(requestId, { method: request.method, pathname: request.nextUrl.pathname, headers: request.headers });
  const response = await handle(request, requestId);
  response.headers.set("X-Request-Id", requestId);
  return response;
}

async function handle(request: NextRequest, requestId: string): Promise<NextResponse> {
  // Continue to the page, passing the (possibly updated) request headers + the ID.
  const { pathname, search } = request.nextUrl;
  // Development: what started this request, for the backend call log (api-log.ts).
  const origin = apiLogMode() === "off" ? null : `${request.method} ${pathname}`;
  const next = () => {
    const forwarded = new Headers(request.headers);
    forwarded.set(REQUEST_ID_HEADER, requestId);
    if (origin) forwarded.set(ORIGIN_HEADER, origin);
    else forwarded.delete(ORIGIN_HEADER);
    return NextResponse.next({ request: { headers: forwarded } });
  };
  const area = PROTECTED_AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  const protectedPage = !!area && pathname !== ROLE_LOGIN[area.role];
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const toLogin = () => {
    const login = new URL(ROLE_LOGIN[area!.role], request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  };

  if (!isSessionToken(token)) {
    if (protectedPage) return withoutSession(toLogin(), request);
    if (!request.cookies.has(USER_COOKIE)) return next();
    const response = withoutSession(NextResponse.next(), request);
    stripped(request);
    return copyCookies(response, next());
  }

  const now = Date.now();
  const stored = await openUser(request.cookies.get(USER_COOKIE)?.value, token, now);
  if (stored?.fresh) return next();

  const incoming = new Headers(request.headers);
  incoming.set(REQUEST_ID_HEADER, requestId);
  if (origin) incoming.set(ORIGIN_HEADER, `session refresh before ${origin}`);
  const me = await callApi<UserResponse>("/users/me", { sessionToken: token, incoming });
  if (me.ok) {
    const user = toCurrentUser(me.data);
    const sealed = user ? await sealUser(user, token, now) : null;
    if (!sealed) return next();
    // Set it on the request too, so this very page already reads the fresh copy.
    request.cookies.set(USER_COOKIE, sealed);
    const response = next();
    response.cookies.set(USER_COOKIE, sealed, { ...USER_COOKIE_OPTIONS, secure: secureCookies() });
    return response;
  }

  // 401: the backend ended this session (logout elsewhere, password reset, expiry).
  if (me.error.status === 401) {
    if (protectedPage) return withoutSession(toLogin(), request);
    const response = withoutSession(NextResponse.next(), request);
    stripped(request);
    return copyCookies(response, next());
  }
  // Backend down or erroring: change nothing; pages keep the last known user.
  return next();
}

// Moves the Set-Cookie changes of `from` onto `to`.
function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  return to;
}

// Removes both cookies from the browser.
function withoutSession(response: NextResponse, request: NextRequest): NextResponse {
  for (const name of [SESSION_COOKIE, USER_COOKIE]) {
    if (request.cookies.has(name)) response.cookies.delete(name);
  }
  return response;
}

// The same request without the dead cookies, so this page renders logged out.
function stripped(request: NextRequest): void {
  request.cookies.delete(SESSION_COOKIE);
  request.cookies.delete(USER_COOKIE);
}

export const config = {
  // Every page and server action; not static files, images or metadata files.
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)"],
};
