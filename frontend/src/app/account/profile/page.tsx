import { ArrowLeft, ChevronRight, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/auth/DashboardShell";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "My Profile", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-10">
      <div>
        <Link href="/account" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          My account
        </Link>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">My profile</h1>
        <p className="mt-1 text-muted">Your name, email and photo.</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <Editor />
      </Suspense>
      {/* Quiet on purpose: easy to find, hard to tap by accident (the next page explains and asks for a code). */}
      <section aria-labelledby="danger-title" className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <h2 id="danger-title" className="font-bold text-ink">
          Delete account
        </h2>
        <p className="mt-1 text-sm text-muted">Remove your account and personal details from 360mart. You&apos;ll see what is deleted and what the law makes us keep before anything happens.</p>
        <Link href="/account/delete" className="group mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50">
          <Trash2 aria-hidden className="size-4" />
          Delete my account
          <ChevronRight aria-hidden className="size-4 transition group-hover:translate-x-0.5" />
        </Link>
      </section>
    </div>
  );
}

async function Editor() {
  const user = await requireRole(SHOPPERS);
  return <ProfileEditor initialUser={user} />;
}
