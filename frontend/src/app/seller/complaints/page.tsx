import { MessageSquareWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Pager, SellerHeader } from "@/components/inventory/SellerHeader";
import { TicketEmpty, TicketRow } from "@/components/support/SupportParts";
import { requireRole } from "@/lib/auth/dal";
import { pageFromParam } from "@/lib/inventory/data";
import { loadStoreTickets } from "@/lib/support/data";
import { OPEN_TICKET_STATUSES, type TicketStatus } from "@/lib/support/types";

export const metadata: Metadata = { title: "Complaints", robots: { index: false, follow: false } };

const TABS = {
  open: { label: "Open", statuses: OPEN_TICKET_STATUSES },
  all: { label: "All", statuses: [] as TicketStatus[] },
} as const;
type Tab = keyof typeof TABS;

function url(tab: Tab, page = 0) {
  const p = new URLSearchParams();
  if (tab !== "open") p.set("tab", tab);
  if (page > 0) p.set("page", String(page + 1));
  const s = p.toString();
  return `/seller/complaints${s ? `?${s}` : ""}`;
}

// /seller/complaints?tab=all&page=2: customers' complaints about the shop's orders (one call).
export default function ComplaintsPage({ searchParams }: PageProps<"/seller/complaints">) {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-10">
        <SellerHeader title="Complaints" subtitle="When a customer reports a problem with one of your orders, it shows here. Reply with what happened on your side; 360mart support decides the outcome." />
        <Suspense fallback={<div aria-hidden className="h-72 animate-pulse rounded-3xl bg-line/60" />}>
          <List searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function List({ searchParams }: Pick<PageProps<"/seller/complaints">, "searchParams">) {
  await requireRole("seller");
  const sp = await searchParams;
  const tab: Tab = sp.tab === "all" ? "all" : "open";
  const page = pageFromParam(sp.page);
  const res = await loadStoreTickets([...TABS[tab].statuses], page, url(tab, page));

  return (
    <div className="space-y-4">
      <nav aria-label="Complaint status">
        <ul className="flex w-max gap-1 rounded-full bg-white p-1 ring-1 ring-line">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <li key={t}>
              <Link
                href={url(t)}
                aria-current={t === tab ? "page" : undefined}
                className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition ${t === tab ? "bg-ink text-white" : "text-ink/70 hover:text-ink"}`}
              >
                {TABS[t].label}
                {t === tab && res.ok && <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">{res.data.totalItems}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {!res.ok ? (
        <p role="alert" className="rounded-3xl border border-line bg-white px-5 py-6 text-sm text-red-700">
          {res.error.message}
        </p>
      ) : res.data.items.length === 0 ? (
        <TicketEmpty icon={MessageSquareWarning} title={tab === "open" ? "No open complaints" : "No complaints yet"} text="Good news. When a customer reports a problem with an order, you'll get a notification and it shows here." />
      ) : (
        <>
          <ul className="space-y-2">
            {res.data.items.map((t) => (
              <li key={t.ticketId}>
                <TicketRow t={t} href={`/seller/complaints/${t.ticketId}`} who="none" />
              </li>
            ))}
          </ul>
          <Pager page={res.data.page} totalPages={res.data.totalPages} href={(p) => url(tab, p)} />
        </>
      )}
    </div>
  );
}
