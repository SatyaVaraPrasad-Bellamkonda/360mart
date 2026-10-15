import Link from "next/link";
import { Avatar } from "@/components/profile/Avatar";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/auth/roles";
import { AuthSync } from "./AuthProvider";

// Header link: "Login" for visitors, or the signed-in user's name linking to
// their dashboard. Reads the session cookie, so it must sit inside <Suspense>.
// It also hands the same user to <AuthProvider> for client components, so the
// backend is asked once per page, not twice.
export async function AccountLink() {
  const user = await getCurrentUser();

  return (
    <>
      <AuthSync user={user} />
      <AccountButton user={user} />
    </>
  );
}

function AccountButton({ user }: { user: CurrentUser | null }) {
  if (!user) {
    return (
      <Link href="/login" className="flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/85">
        Login
      </Link>
    );
  }

  return (
    <Link
      href={ROLE_HOME[user.role]}
      aria-label="My account"
      className="flex min-h-10 items-center gap-2 rounded-full border border-line py-1 pl-1 pr-4 text-sm font-semibold text-ink hover:border-ink"
    >
      <Avatar user={user} size="sm" />
      {/* First name only, never the phone number: the header is visible to anyone near the screen. */}
      <span className="max-w-28 truncate">{user.firstName ?? "My account"}</span>
    </Link>
  );
}

export function AccountLinkFallback() {
  return <span aria-hidden className="inline-block h-9 w-20 rounded-full bg-surface" />;
}
