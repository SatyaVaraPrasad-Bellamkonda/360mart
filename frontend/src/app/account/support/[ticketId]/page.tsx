import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CustomerTicketView } from "@/components/support/CustomerTicketView";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { loadMyTicket } from "@/lib/support/data";
import { LoadFailed } from "../../addresses/AddressPageHeader";

export const metadata: Metadata = { title: "Support request", robots: { index: false, follow: false } };

// /account/support/[id]: one request (one call, never cached: photo links expire).
export default function TicketPage({ params, searchParams }: PageProps<"/account/support/[ticketId]">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:py-10">
        <Link href="/account/support" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          Help & support
        </Link>
        <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-3xl bg-line/60" />}>
          <Ticket params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Ticket({ params, searchParams }: Pick<PageProps<"/account/support/[ticketId]">, "params" | "searchParams">) {
  await requireRole(SHOPPERS);
  const [{ ticketId }, { created }] = await Promise.all([params, searchParams]);
  const res = await loadMyTicket(ticketId, `/account/support/${ticketId}`);
  if (!res.ok) return <LoadFailed message={res.error.message} />;
  if (!res.data) notFound();
  return <CustomerTicketView key={res.data.ticketId} initial={res.data} created={created === "1"} />;
}
