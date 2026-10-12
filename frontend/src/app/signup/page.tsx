import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, LocalOtpHint } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { OtpPasswordForm } from "@/components/auth/OtpPasswordForm";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default function SignupPage() {
  return (
    <AuthCard
      badge="New customer"
      title="Create your 360mart account"
      subtitle="We'll text a 6-digit code to confirm your mobile number. Then choose a password."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="inline-block py-2 font-semibold text-brand-deep hover:underline">
            Login
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Suspense fallback={<FormSkeleton />}>
        <OtpPasswordForm mode="signup" />
      </Suspense>
      <LocalOtpHint />
    </AuthCard>
  );
}

