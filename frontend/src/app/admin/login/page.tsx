import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { AuthCard, TestModeHint } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { isMockMode } from "@/lib/auth/auth-service";

export const metadata: Metadata = { title: "Admin Login", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <AuthCard badge="Admin" title="Admin sign in" subtitle="For the 360mart team only.">
      <Suspense fallback={<FormSkeleton />}>
        <AdminLoginForm />
      </Suspense>
      {isMockMode() && <TestModeHint>use the ADMIN_EMAIL and ADMIN_PASSWORD from your .env.local file.</TestModeHint>}
    </AuthCard>
  );
}
