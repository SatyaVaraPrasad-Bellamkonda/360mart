import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_AREAS, ROLE_LOGIN, SESSION_COOKIE } from "@/lib/auth/roles";

// Runs before /account, /seller and /admin pages load. No session cookie at
// all → straight to that area's login, remembering where they were going.
// It can't tell whether a cookie is still valid (only the backend knows), so
// every protected page also checks with requireRole().
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const area = PROTECTED_AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  if (!area || pathname === ROLE_LOGIN[area.role] || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL(ROLE_LOGIN[area.role], request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/account/:path*", "/seller/:path*", "/admin/:path*"],
};
