import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { LoginForm } from "@/components/auth/LoginForm";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";

export const metadata: Metadata = { title: "Shopkeeper Login", robots: { index: false, follow: false } };

export default function SellerLoginPage() {
  return (
    <AuthCard
      badge="Shopkeeper"
      title="Login to your store"
      subtitle="Use the mobile number and password of your 360mart store account."
      footer={
        <>
          Shopping on 360mart?{" "}
          <Link href="/login" className="inline-block py-2 font-semibold text-brand-deep hover:underline">
            Customer login
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn onlyRole="seller" />
      </Suspense>
      <Suspense fallback={<FormSkeleton />}>
        <LoginForm area="seller" />
      </Suspense>
    </AuthCard>
  );
}
