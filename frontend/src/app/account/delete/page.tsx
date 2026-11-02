import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DeleteAccountFlow } from "@/components/account/DeleteAccountFlow";
import { FormMessage } from "@/components/auth/AuthCard";
import { getDeletionStatus } from "@/lib/account/deletion";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { getSessionToken } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Delete account", robots: { index: false, follow: false } };

// /account/delete: delete this account (also the page app stores ask for:
// logged-out visitors are sent to the login first by proxy.ts, then back here).
// One call on load (what would be deleted / kept, and anything blocking it).
export default function DeleteAccountPage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-10">
        <div>
          <Link href="/account/profile" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft aria-hidden className="size-4" />
            My profile
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Delete your account</h1>
          <p className="mt-1 max-w-2xl text-muted">Read what happens first. Deleting can&apos;t be undone: you&apos;d need to sign up again to shop on 360mart.</p>
        </div>
        <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-3xl bg-line/60" />}>
          <Flow />
        </Suspense>
      </div>
    </div>
  );
}

async function Flow() {
  const user = await requireRole(SHOPPERS);
  const token = await getSessionToken();
  const status = token ? await getDeletionStatus(token) : null;
  if (!status?.ok) return <FormMessage error={status?.error.message ?? "Please login to continue."} />;
  return <DeleteAccountFlow status={status.data} mobileNumber={user.mobileNumber} />;
}
