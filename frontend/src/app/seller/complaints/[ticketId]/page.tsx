import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SellerHeader } from "@/components/inventory/SellerHeader";
import { StoreTicketView } from "@/components/support/StoreTicketView";
import { requireRole } from "@/lib/auth/dal";
import { loadStoreTicket } from "@/lib/support/data";

export const metadata: Metadata = { title: "Complaint", robots: { index: false, follow: false } };

// /seller/complaints/[id]: one complaint (one call). The customer shows as a first name only.
export default function ComplaintPage({ params }: PageProps<"/seller/complaints/[ticketId]">) {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-3xl bg-line/60" />}>
          <Complaint params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Complaint({ params }: Pick<PageProps<"/seller/complaints/[ticketId]">, "params">) {
  await requireRole("seller");
  const { ticketId } = await params;
  const res = await loadStoreTicket(ticketId, `/seller/complaints/${ticketId}`);
  if (!res.ok)
    return (
      <p role="alert" className="rounded-3xl border border-line bg-white px-5 py-6 text-sm text-red-700">
        {res.error.message}
      </p>
    );
  if (!res.data) notFound();
  return (
    <>
      <SellerHeader title={res.data.ticketNumber} crumbs={[{ name: "Complaints", href: "/seller/complaints" }]} />
      <StoreTicketView key={res.data.ticketId} initial={res.data} />
    </>
  );
}
