import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { requireRole } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Your profile" };

// The same profile editor customers use (/account/profile); the server actions
// always work on the signed-in user, whatever their role.
export default function AdminProfilePage() {
  return (
    <>
      <AdminPageHeader title="Your profile" subtitle="Your name, email and photo, shown in the admin panel." action={<LogoutButton />} />
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-3xl bg-line/60" />}>
        <Editor />
      </Suspense>
    </>
  );
}

async function Editor() {
  const user = await requireRole("admin");
  return <ProfileEditor initialUser={user} />;
}
