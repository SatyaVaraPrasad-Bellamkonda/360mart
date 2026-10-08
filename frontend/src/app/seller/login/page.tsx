import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard, TestModeHint } from "@/components/auth/AuthCard";
import { FormSkeleton } from "@/components/auth/FormSkeleton";
import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { otpLoginAction } from "@/lib/auth/actions";
import { isMockMode } from "@/lib/auth/auth-service";

export const metadata: Metadata = { title: "Shopkeeper Login", robots: { index: false, follow: false } };

export default function SellerLoginPage() {
  return (
    <AuthCard
      badge="Shopkeeper"
      title="Login to your store"
      subtitle="Use the mobile number registered with your 360mart store."
      footer={
        <>
          Shopping on 360mart?{" "}
          <Link href="/login" className="font-semibold text-brand-deep hover:underline">
            Customer login
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <OtpLoginForm action={otpLoginAction.bind(null, "seller")} />
      </Suspense>
      {isMockMode() && (
        <TestModeHint>
          registered test stores are 9000000001, 9000000002 and 9000000003. OTP is <strong>123456</strong>.
        </TestModeHint>
      )}
    </AuthCard>
  );
}
