import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/auth/current-user";

// Nudge to finish the profile; disappears once everything is filled in.
// Only real facts: each step is something the user can still add.
export function ProfileProgress({ user }: { user: CurrentUser }) {
  const steps = [
    { label: "Your name", done: !!user.firstName },
    { label: "Email for receipts", done: !!user.email },
    { label: "Profile photo", done: !!user.profileImageUrl },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const percent = Math.round((done / steps.length) * 100);

  return (
    <section aria-labelledby="progress-title" className="rounded-3xl border border-brand/30 bg-brand-soft/60 p-5 sm:p-6 motion-safe:animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <div>
            <h2 id="progress-title" className="font-bold text-ink">
              Complete your profile
            </h2>
            <p className="text-sm text-brand-deep">
              {done} of {steps.length} done · stores use your name and email for order updates
            </p>
          </div>
        </div>
        {/* Wide screens: button beside the title. Phones: full width at the bottom (below). */}
        <FinishLink className="hidden sm:flex" />
      </div>

      <div
        role="progressbar"
        aria-label="Profile completed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-4 h-2 overflow-hidden rounded-full bg-white"
      >
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {steps.map((step) => (
          <li
            key={step.label}
            className={`flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium ${step.done ? "bg-fresh-soft text-fresh" : "bg-white text-muted ring-1 ring-line"}`}
          >
            {step.done ? <Check aria-hidden className="size-4" /> : <span aria-hidden className="size-2 rounded-full bg-line" />}
            {step.label}
            <span className="sr-only">{step.done ? "(done)" : "(to do)"}</span>
          </li>
        ))}
      </ul>
      <FinishLink className="mt-5 flex w-full sm:hidden" />
    </section>
  );
}

function FinishLink({ className }: { className: string }) {
  return (
    <Link
      href="/account/profile"
      className={`min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85 ${className}`}
    >
      Finish profile
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}
