import { Store } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/profile/Avatar";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/auth/roles";
import { AuthSync } from "./AuthProvider";
import { NavPill } from "./NavPill";

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

  // Shopkeepers shop too: their avatar opens the shopping account, and a
  // separate button opens their store. Customers never see the store link.
  const account = user.role === "seller" ? "/account" : ROLE_HOME[user.role];
  return (
    <div className="flex items-center gap-2">
      {user.role === "seller" && (
        <NavPill href="/seller" area="/seller" label="Your store" className="size-10 justify-center sm:w-auto sm:px-4">
          <Store aria-hidden className="size-4 shrink-0" />
          <span className="hidden sm:inline">Your store</span>
        </NavPill>
      )}
      <AccountChip user={user} href={account} />
    </div>
  );
}

function AccountChip({ user, href }: { user: CurrentUser; href: string }) {
  return (
    <NavPill href={href} area={href} label="My account" className="py-1 pl-1 pr-1 sm:pr-4">
      <Avatar user={user} size="sm" />
      {/* First name only, never the phone number: the header is visible to anyone near the screen. On phones only the avatar, like "Your store". */}
      <span className="hidden max-w-28 truncate sm:inline">{user.firstName ?? "My account"}</span>
    </NavPill>
  );
}

export function AccountLinkFallback() {
  return <span aria-hidden className="inline-block h-9 w-20 rounded-full bg-surface" />;
}
