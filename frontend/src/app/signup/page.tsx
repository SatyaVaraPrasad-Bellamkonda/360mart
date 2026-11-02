import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { OtpPasswordForm } from "@/components/auth/OtpPasswordForm";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";
import { getPolicies } from "@/lib/legal/data";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default function SignupPage() {
  return (
    <AuthCard
      badge="New account"
      title="Create your 360mart account"
      subtitle="Shop from neighbourhood stores, or register your own store. We'll text a 6-digit code to confirm your number, then you choose a password."
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
        <SignupForm />
      </Suspense>
    </AuthCard>
  );
}

// The current Terms and Privacy versions (cached list), so the ones agreed to are the ones recorded.
async function SignupForm() {
  const policies = await getPolicies();
  const shown = (policies.ok ? policies.data : []).filter((p) => p.policyType === "TERMS" || p.policyType === "PRIVACY").map((p) => ({ policyType: p.policyType, version: p.version }));
  return <OtpPasswordForm mode="signup" signupPolicies={shown} />;
}
