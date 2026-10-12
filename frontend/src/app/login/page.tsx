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
      badge="Customer"
      title="Login to 360mart"
      subtitle="Use your mobile number and password."
      footer={
        <div className="space-y-1">
          <p>
            New to 360mart?{" "}
            <Link href="/signup" className="inline-block py-2 font-semibold text-brand-deep hover:underline">
              Create an account
            </Link>
          </p>
          <p>
            Own a shop?{" "}
            <Link href="/seller/login" className="inline-block py-2 font-semibold text-brand-deep hover:underline">
              Shopkeeper login
            </Link>
          </p>
        </div>
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
