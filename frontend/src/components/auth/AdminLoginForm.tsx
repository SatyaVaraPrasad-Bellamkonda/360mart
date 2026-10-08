"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { adminLoginAction } from "@/lib/auth/actions";
import { FormMessage } from "./AuthCard";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLoginAction, {});
  const next = useSearchParams().get("next") ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage error={state.error} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Email</span>
        <input
          key={state.email}
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          autoFocus
          className="w-full rounded-xl border border-line px-3 py-3 text-ink outline-none focus:border-ink"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-line px-3 py-3 text-ink outline-none focus:border-ink"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-6 py-3 font-semibold text-white hover:bg-ink/85 disabled:cursor-wait disabled:bg-ink/60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
