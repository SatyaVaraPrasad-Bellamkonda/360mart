import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { OtpPasswordForm } from "@/components/auth/OtpPasswordForm";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      badge="Account help"
      title="Reset your password"
      subtitle="Enter your mobile number. We'll text you a code so you can choose a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="inline-block py-2 font-semibold text-brand-deep hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Suspense fallback={<FormSkeleton />}>
        <OtpPasswordForm mode="reset" />
      </Suspense>
    </AuthCard>
  );
}
