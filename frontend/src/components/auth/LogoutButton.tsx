import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:border-ink"
      >
        Log out
      </button>
    </form>
  );
}
