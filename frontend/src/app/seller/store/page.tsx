import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StoreWizard } from "@/components/seller/StoreWizard";
import { StatusPill } from "@/components/stores/StoreParts";
import { requireRole } from "@/lib/auth/dal";
import { mapConfig } from "@/lib/maps/config";
import { loadMyStore } from "@/lib/stores/data";
import { isStep } from "@/lib/stores/progress";
import { EDITABLE_STATUSES } from "@/lib/stores/types";

export const metadata: Metadata = { title: "Store Registration", robots: { index: false, follow: false } };

// /seller/store?step=hours opens that step (links from the dashboard).
export default function StoreRegistrationPage({ searchParams }: PageProps<"/seller/store">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-10">
        <Suspense fallback={<RegistrationSkeleton />}>
          <Registration searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

// One backend call; after that every save returns the whole application.
async function Registration({ searchParams }: Pick<PageProps<"/seller/store">, "searchParams">) {
  const user = await requireRole("seller");
  const { step } = await searchParams;
  const res = await loadMyStore("/seller/store");
  const app = res.ok ? res.data : null;
  const editing = !app || EDITABLE_STATUSES.includes(app.store.status);
  return (
    <>
      <header className="space-y-3">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
            <li className="flex items-center gap-1">
              <Link href="/seller" className="-my-2 inline-flex min-h-10 items-center rounded-md px-1 font-semibold hover:text-ink">
                Your store
              </Link>
              <ChevronRight aria-hidden className="size-4" />
            </li>
            <li aria-current="page" className="px-1 font-semibold text-ink">
              {editing ? "Registration" : "Store details"}
            </li>
          </ol>
        </nav>
        <div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {app?.store.name ?? "Register your store"}
              {app && <StatusPill status={app.store.status} />}
            </h1>
            <p className="mt-1 text-muted">{editing ? "Save each step as you go, and submit when all are done." : "Your application as submitted."}</p>
          </div>
        </div>
      </header>
      {res.ok ? (
        <StoreWizard initial={app} ownerPhone={user.mobileNumber} map={mapConfig()} startStep={isStep(step) ? step : undefined} />
      ) : (
        <p role="alert" className="rounded-3xl border border-line bg-white px-5 py-6 text-sm text-red-700">
          {res.error.message}
        </p>
      )}
    </>
  );
}

function RegistrationSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-20 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-14 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
