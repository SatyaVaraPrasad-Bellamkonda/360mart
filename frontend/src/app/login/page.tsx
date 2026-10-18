import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { LoginForm } from "@/components/auth/LoginForm";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";

export const metadata: Metadata = { title: "Login", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <AuthCard
      badge="Welcome back"
      title="Login to 360mart"
      subtitle="Shoppers and shopkeepers: use your mobile number and password."
      footer={
        <>
          {/* Signup itself asks whether you want to shop or sell. */}
          New to 360mart?{" "}
          <Link href="/signup" className="inline-block py-2 font-semibold text-brand-deep hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm area="customer" />
      </Suspense>
    </AuthCard>
  );
}
