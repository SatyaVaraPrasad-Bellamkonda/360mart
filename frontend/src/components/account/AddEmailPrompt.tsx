"use client";

import { ArrowRight, MailWarning, X } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

// "Add your email" reminder for accounts without a verified email (everyone who
// signed up before codes went by email). Without one, "forgot password" and
// "delete account" can't send them a code. Shown on /account and the seller hub;
// "Not now" hides it on this device for this user (a convenience only, so a
// browser without storage simply keeps showing it).

const KEY = "360mart.emailPromptDismissed";
const listeners = new Set<() => void>();

function dismissedFor(userId: string): boolean {
  try {
    return localStorage.getItem(KEY) === userId;
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function AddEmailPrompt({ userId, hasEmail }: { userId: string; hasEmail: boolean }) {
  // Server and first paint: hidden, so a dismissed prompt never flashes.
  const dismissed = useSyncExternalStore(subscribe, () => dismissedFor(userId), () => true);
  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, userId);
    } catch {
      // No storage (private mode): it just shows again next time.
    }
    listeners.forEach((l) => l());
  }

  return (
    <section aria-labelledby="add-email-title" className="flex flex-col gap-4 rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:p-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 ring-1 ring-amber-200">
          <MailWarning aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="add-email-title" className="font-bold text-amber-950">
            {hasEmail ? "Verify your email" : "Add your email"}
          </h2>
          <p className="text-sm text-amber-950/80">Your codes now come by email, not SMS. Add your email so you can log in with a code and reset your password.</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/account/profile#email" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 sm:flex-none">
          {hasEmail ? "Verify email" : "Add email"}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
        <button type="button" onClick={dismiss} className="flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-amber-950 transition hover:bg-amber-100">
          <X aria-hidden className="size-4" />
          Not now
        </button>
      </div>
    </section>
  );
}
