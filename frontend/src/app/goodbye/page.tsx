import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ForgetThisBrowser } from "@/components/account/ForgetThisBrowser";

export const metadata: Metadata = { title: "Account deleted", robots: { index: false, follow: false } };

// /goodbye: where account deletion lands (public: the session is gone by now).
// The browser's own copies (cart, Deliver-to point, recent searches…) are wiped here.
export default function GoodbyePage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-xl px-4 py-12 sm:py-20">
        <ForgetThisBrowser />
        <section className="flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-line motion-safe:animate-fade-up">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-fresh-soft text-fresh">
            <CheckCircle2 aria-hidden className="size-8" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Your account has been deleted</h1>
          <p className="mt-2 max-w-sm text-muted">
            Thank you for shopping with 360mart. Your details are gone; past orders and invoices are kept only as the law requires. You&apos;re welcome back any time.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/" className="flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
              Go to the home page
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link href="/privacy" className="flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
              Privacy Policy
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
