import { ArrowLeft, BadgeIndianRupee, Clock, FileCheck2, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BecomeRider } from "@/components/delivery/BecomeRider";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Deliver with 360mart", robots: { index: false, follow: false } };

const STEPS = [
  { icon: FileCheck2, title: "Apply", text: "Your vehicle, an ID proof, and for licensed vehicles your driving licence and RC." },
  { icon: Clock, title: "Get approved", text: "Our team checks your documents." },
  { icon: Smartphone, title: "Deliver with the app", text: "Go online in the 360mart app and accept orders from stores near you." },
  { icon: BadgeIndianRupee, title: "Keep shopping", text: "Same account and login: your orders and addresses stay." },
];

// A customer becomes a delivery partner (POST /users/me/delivery-partner).
// Shopkeepers and admins can't (the backend answers ROLE_CHANGE_NOT_ALLOWED);
// someone who already is one goes straight to /rider.
export default function DeliverPage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10">
        <Link href="/account" className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          My account
        </Link>
        <header>
          <p className="text-sm font-semibold text-brand-deep">360mart delivery partners</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Deliver with 360mart</h1>
          <p className="mt-1 text-muted">Deliver orders from neighbourhood stores near you, when it suits you.</p>
        </header>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-3xl bg-white p-4 ring-1 ring-line">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-deep">
                <s.icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">
                  {i + 1}. {s.title}
                </span>
                <span className="block text-sm text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <section className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
          <h2 className="mb-4 font-bold text-ink">Your vehicle</h2>
          <Suspense fallback={<div aria-hidden className="h-56 animate-pulse rounded-2xl bg-line/60" />}>
            <Gate />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

async function Gate() {
  const user = await requireRole(SHOPPERS);
  if (user.role === "rider") redirect("/rider");
  if (user.role !== "customer") {
    return <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted">Shopkeeper accounts can&apos;t also be delivery partners. To deliver, sign up with a different mobile number.</p>;
  }
  return <BecomeRider />;
}
