import { ArrowLeft } from "lucide-react";
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
    </div>
  );
}

async function Editor() {
  const user = await requireRole(SHOPPERS);
  return <ProfileEditor initialUser={user} />;
}
