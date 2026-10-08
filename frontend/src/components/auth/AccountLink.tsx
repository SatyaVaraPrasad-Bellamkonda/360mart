import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/auth/roles";

// Header link: "Login" for visitors, or the signed-in user's name linking to
// their dashboard. Reads the session cookie, so it must sit inside <Suspense>.
export async function AccountLink() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link href="/login" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85">
        Login
      </Link>
    );
  }

  return (
    <Link
      href={ROLE_HOME[user.role]}
      className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-ink"
    >
      <span aria-hidden>👤</span>
      <span className="max-w-36 truncate">{user.displayName}</span>
    </Link>
  );
}

export function AccountLinkFallback() {
  return <span aria-hidden className="inline-block h-9 w-20 rounded-full bg-surface" />;
}
