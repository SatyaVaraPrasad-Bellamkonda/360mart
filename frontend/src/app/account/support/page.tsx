import { Clock, LifeBuoy, Mail, MessageSquarePlus, Phone, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TicketEmpty, TicketRow } from "@/components/support/SupportParts";
import { Pager } from "@/components/inventory/SellerHeader";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { pageFromParam } from "@/lib/inventory/data";
import { getContact } from "@/lib/legal/data";
import { loadMyTickets } from "@/lib/support/data";
import { AddressPageHeader, LoadFailed } from "../addresses/AddressPageHeader";

export const metadata: Metadata = { title: "Help & support", robots: { index: false, follow: false } };

const href = (page: number) => (page > 0 ? `/account/support?page=${page + 1}` : "/account/support");

// /account/support?page=2: how to reach 360mart (cached contact details) and
// the shopper's requests (one call). Problems with an order start from the order page.
export default function SupportPage({ searchParams }: PageProps<"/account/support">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-10">
        <AddressPageHeader back="/account" backLabel="My account" title="Help & support" subtitle="Tell us what went wrong and we'll sort it out. Every request gets an answer within 48 hours." />
        <Suspense fallback={<div aria-hidden className="h-40 animate-pulse rounded-3xl bg-line/60" />}>
          <ContactCard />
        </Suspense>
        <Suspense fallback={<div aria-hidden className="h-72 animate-pulse rounded-3xl bg-line/60" />}>
          <Requests searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ContactCard() {
  const res = await getContact();
  const c = res.ok ? res.data : null;
  return (
    <section className="grid gap-4 rounded-3xl bg-ink p-5 text-white sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink">
          <LifeBuoy aria-hidden className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Problem with an order?</h2>
          <p className="mt-1 text-sm text-white/75">Open the order and tap &quot;Get help with this order&quot;: we&apos;ll know the store and the items straight away.</p>
          {c && (
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {c.supportPhone && (
                <li>
                  <a href={`tel:${c.supportPhone}`} className="inline-flex min-h-10 items-center gap-2 font-semibold hover:underline">
                    <Phone aria-hidden className="size-4" /> {c.supportPhone}
                  </a>
                </li>
              )}
              {c.supportEmail && (
                <li>
                  <a href={`mailto:${c.supportEmail}`} className="inline-flex min-h-10 items-center gap-2 break-all font-semibold hover:underline">
                    <Mail aria-hidden className="size-4" /> {c.supportEmail}
                  </a>
                </li>
              )}
              {c.supportHours && (
                <li className="inline-flex min-h-10 items-center gap-2 text-white/75">
                  <Clock aria-hidden className="size-4" /> {c.supportHours}
                </li>
              )}
            </ul>
          )}
          <Link href="/contact" className="mt-1 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand hover:underline">
            <Scale aria-hidden className="size-4" /> Grievance officer and complaints
          </Link>
        </div>
      </div>
      <Link href="/account/support/new" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink hover:bg-white/90">
        <MessageSquarePlus aria-hidden className="size-4" />
        New request
      </Link>
    </section>
  );
}

async function Requests({ searchParams }: Pick<PageProps<"/account/support">, "searchParams">) {
  await requireRole(SHOPPERS);
  const page = pageFromParam((await searchParams).page);
  const res = await loadMyTickets(page, href(page));
  if (!res.ok) return <LoadFailed message={res.error.message} />;
  const { items, totalPages, totalItems } = res.data;
  return (
    <section aria-labelledby="requests-title" className="space-y-3">
      <h2 id="requests-title" className="text-lg font-bold text-ink">
        Your requests {totalItems > 0 && <span className="text-sm font-semibold text-muted">({totalItems})</span>}
      </h2>
      {items.length === 0 ? (
        <TicketEmpty title="No requests yet" text="When you ask us for help, you can follow the conversation and the outcome here." />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((t) => (
              <li key={t.ticketId}>
                <TicketRow t={t} href={`/account/support/${t.ticketId}`} />
              </li>
            ))}
          </ul>
          <Pager page={res.data.page} totalPages={totalPages} href={href} />
        </>
      )}
    </section>
  );
}
