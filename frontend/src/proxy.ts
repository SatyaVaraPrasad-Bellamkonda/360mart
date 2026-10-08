import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_AREAS, ROLE_HOME, ROLE_LOGIN, SESSION_COOKIE, type Role } from "@/lib/auth/roles";
import { verifySession } from "@/lib/auth/token";

// Runs before /login, /account, /seller and /admin pages load.
// - Not logged in (or wrong role) on a protected page → send to that area's login.
// - Already logged in and opening your own login page → send to your dashboard.
// This is a fast pre-check only; each protected page re-checks with requireRole().
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  const loginRole = (Object.keys(ROLE_LOGIN) as Role[]).find((role) => ROLE_LOGIN[role] === pathname);
  if (loginRole) {
    if (session?.role === loginRole) return NextResponse.redirect(new URL(ROLE_HOME[loginRole], request.url));
    return NextResponse.next();
  }

  const area = PROTECTED_AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  if (area && session?.role !== area.role) {
    const login = new URL(ROLE_LOGIN[area.role], request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/account/:path*", "/seller/:path*", "/admin/:path*"],
};
