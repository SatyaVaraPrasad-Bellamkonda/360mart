import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_HOME, type Role } from "@/lib/auth/roles";

// Put inside <Suspense> on login/signup pages: someone already signed in goes
// straight to their dashboard. With `onlyRole`, other roles stay on the page
// (e.g. a customer may open the shopkeeper login to switch accounts).
// This can't live in proxy.ts: only the backend knows if the cookie is still valid.
export async function RedirectIfSignedIn({ onlyRole }: { onlyRole?: Role }) {
  const user = await getCurrentUser();
  if (user && (!onlyRole || user.role === onlyRole)) redirect(ROLE_HOME[user.role]);
  return null;
}
