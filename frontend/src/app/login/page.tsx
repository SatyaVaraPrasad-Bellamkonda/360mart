import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, TestModeHint } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { otpLoginAction } from "@/lib/auth/actions";
import { isMockMode } from "@/lib/auth/auth-service";

export const metadata: Metadata = { title: "Login", robots: { index: false, follow: false } };

export default function CustomerLoginPage() {
  return (
    <AuthCard
      badge="Customer"
      title="Login to 360mart"
      subtitle="Enter your mobile number and we'll send you a one-time password (OTP)."
      footer={
        <>
          Own a shop?{" "}
          <Link href="/seller/login" className="inline-block py-2 font-semibold text-brand-deep hover:underline">
            Shopkeeper login
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <OtpLoginForm action={otpLoginAction.bind(null, "customer")} />
      </Suspense>
      {isMockMode() && (
        <TestModeHint>
          use any mobile number starting with 6–9, then OTP <strong>123456</strong>.
        </TestModeHint>
      )}
    </AuthCard>
  );
}
