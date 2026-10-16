import { logoutAction } from "@/lib/auth/actions";

const LIGHT = "rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:border-ink";
// On dark backgrounds (the admin panel).
const DARK = "min-h-10 w-full rounded-full border border-white/25 px-4 text-sm font-semibold text-white hover:border-white";

export function LogoutButton({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <form action={logoutAction}>
      <button type="submit" className={tone === "dark" ? DARK : LIGHT}>
        Log out
      </button>
    </form>
  );
}
