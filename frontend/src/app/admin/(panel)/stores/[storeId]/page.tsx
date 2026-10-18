import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader, SECONDARY_BUTTON } from "@/components/admin/AdminShell";
import { StoreReview } from "@/components/admin/StoreReview";
import { requireRole } from "@/lib/auth/dal";
import { loadStore } from "@/lib/stores/data";

export const metadata: Metadata = { title: "Review store" };

const CRUMBS = [{ name: "Stores", href: "/admin/stores" }];

// One backend call: the whole application (details, hours, documents with file links, checklist).
export default function AdminStorePage({ params }: PageProps<"/admin/stores/[storeId]">) {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <Review params={params} />
    </Suspense>
  );
}

async function Review({ params }: Pick<PageProps<"/admin/stores/[storeId]">, "params">) {
  await requireRole("admin");
  const { storeId } = await params;
  const res = await loadStore(storeId, `/admin/stores/${storeId}`);
  if (!res.ok) {
    return (
      <>
        <AdminPageHeader title="Review store" crumbs={CRUMBS} />
        <AdminLoadFailed message={res.error.message} />
      </>
    );
  }
  if (!res.data) {
    return (
      <>
        <AdminPageHeader title="Store not found" crumbs={CRUMBS} />
        <div className="rounded-3xl bg-white px-5 py-6 ring-1 ring-line">
          <p className="font-semibold text-ink">There&apos;s no store with this link.</p>
          <Link href="/admin/stores" className={`mt-4 inline-flex ${SECONDARY_BUTTON}`}>
            Back to stores
          </Link>
        </div>
      </>
    );
  }
  return (
    <>
      <AdminPageHeader title={res.data.store.name} subtitle="Open each document, verify or reject it, then approve the store or send it back." crumbs={CRUMBS} />
      <StoreReview initial={res.data} />
    </>
  );
}

function ReviewSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-24 animate-pulse rounded-3xl bg-line/60" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        <div className="h-64 animate-pulse rounded-3xl bg-line/60" />
      </div>
    </div>
  );
}
