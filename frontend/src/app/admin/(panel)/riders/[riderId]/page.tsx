import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { RiderReview } from "@/components/delivery/RiderReview";
import { requireRole } from "@/lib/auth/dal";
import { loadAdminRider } from "@/lib/delivery/data";

export const metadata: Metadata = { title: "Delivery partner", robots: { index: false, follow: false } };

const CRUMBS = [{ name: "Delivery partners", href: "/admin/riders" }];

// One call: the rider with documents (signed links), missing steps and cash. The cash history loads on demand.
export default function AdminRiderPage({ params }: PageProps<"/admin/riders/[riderId]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/admin/riders/[riderId]">, "params">) {
  await requireRole("admin");
  const { riderId } = await params;
  const res = await loadAdminRider(riderId, `/admin/riders/${riderId}`);
  if (!res.ok) {
    return (
      <>
        <AdminPageHeader title="Delivery partner" crumbs={CRUMBS} />
        <AdminLoadFailed message={res.error.message} />
      </>
    );
  }
  if (!res.data) notFound();
  return (
    <>
      <AdminPageHeader title={res.data.name ?? "Delivery partner"} subtitle="Documents, decision and cash." crumbs={CRUMBS} />
      <RiderReview key={res.data.riderId} initial={res.data} />
    </>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-24 animate-pulse rounded-3xl bg-line/60" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        <div className="h-56 animate-pulse rounded-3xl bg-line/60" />
      </div>
    </div>
  );
}
