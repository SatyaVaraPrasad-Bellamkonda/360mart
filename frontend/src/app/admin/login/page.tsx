import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { LoginForm } from "@/components/auth/LoginForm";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";

export const metadata: Metadata = { title: "Admin Login", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <AuthCard badge="Admin" title="Admin sign in" subtitle="For the 360mart team only.">
      <Suspense fallback={null}>
        <RedirectIfSignedIn onlyRole="admin" />
      </Suspense>
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm area="admin" />
      </Suspense>
    </AuthCard>
  );
}
