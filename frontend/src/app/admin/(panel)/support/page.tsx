import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { Pager } from "@/components/inventory/SellerHeader";
import { TicketEmpty, TicketRow } from "@/components/support/SupportParts";
import { requireRole } from "@/lib/auth/dal";
import { pageFromParam } from "@/lib/inventory/data";
import { loadAdminTickets } from "@/lib/support/data";
import { CATEGORIES, type SupportCategory, type TicketStatus } from "@/lib/support/types";

export const metadata: Metadata = { title: "Support queue", robots: { index: false, follow: false } };

// ?status= is a named tab (one call with repeated statuses; the backend's
// default is open requests, oldest first, so the longest waiting is on top).
const TABS = {
  open: { label: "Open", statuses: ["OPEN", "IN_PROGRESS"] },
  new: { label: "Not answered", statuses: ["OPEN"] },
  progress: { label: "We're on it", statuses: ["IN_PROGRESS"] },
  closed: { label: "Closed", statuses: ["RESOLVED", "REJECTED", "WITHDRAWN"] },
} as const satisfies Record<string, { label: string; statuses: TicketStatus[] }>;
type Tab = keyof typeof TABS;
const isTab = (v: unknown): v is Tab => typeof v === "string" && v in TABS;
const isCategory = (v: unknown): v is SupportCategory => typeof v === "string" && v in CATEGORIES;

type Filters = { tab: Tab; category?: SupportCategory; overdue: boolean };

function href(f: Filters, page = 0) {
  const q = new URLSearchParams();
  if (f.tab !== "open") q.set("status", f.tab);
  if (f.category) q.set("category", f.category);
  if (f.overdue) q.set("overdue", "1");
  if (page) q.set("page", String(page + 1));
  const s = q.toString();
  return s ? `/admin/support?${s}` : "/admin/support";
}

// /admin/support?status=new&category=DAMAGED_ITEM&overdue=1: the support queue (one call).
export default function SupportQueuePage({ searchParams }: PageProps<"/admin/support">) {
  return (
    <>
      <AdminPageHeader title="Support queue" subtitle="Customers' requests, longest waiting first. By law every request gets a reply within 48 hours and an outcome within 30 days." />
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-3xl bg-line/60" />}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Queue({ searchParams }: Pick<PageProps<"/admin/support">, "searchParams">) {
  await requireRole("admin");
  const sp = await searchParams;
  const f: Filters = { tab: isTab(sp.status) ? sp.status : "open", category: isCategory(sp.category) ? sp.category : undefined, overdue: sp.overdue === "1" };
  const page = pageFromParam(sp.page);
  const res = await loadAdminTickets({ status: [...TABS[f.tab].statuses], category: f.category, overdue: f.overdue, page }, href(f, page));

  return (
    <div className="space-y-4">
      <nav aria-label="Request status" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {(Object.keys(TABS) as Tab[]).map((t) => {
            const current = t === f.tab;
            return (
              <li key={t}>
                <Link
                  href={href({ ...f, tab: t })}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${current ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
                >
                  {TABS[t].label}
                  {current && res.ok && <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">{res.data.totalItems}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* A plain GET form: works without JavaScript and keeps the filters in the URL. */}
      <form action="/admin/support" className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
        {f.tab !== "open" && <input type="hidden" name="status" value={f.tab} />}
        <label className="min-w-0 flex-1 sm:flex-none">
          <span className="mb-1 block text-xs font-semibold text-muted">Problem</span>
          <select name="category" defaultValue={f.category ?? ""} className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink sm:w-60">
            <option value="">All problems</option>
            {(Object.keys(CATEGORIES) as SupportCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c].label}
                {CATEGORIES[c].kind === "GENERAL" ? " (no order)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-semibold text-ink">
          <input type="checkbox" name="overdue" value="1" defaultChecked={f.overdue} className="size-5 accent-red-600" />
          Overdue only
        </label>
        <button type="submit" className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
          Apply
        </button>
        {(f.category || f.overdue) && (
          <Link href={href({ tab: f.tab, overdue: false })} className="flex min-h-11 items-center px-2 text-sm font-semibold text-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      {!res.ok ? (
        <AdminLoadFailed message={res.error.message} />
      ) : res.data.items.length === 0 ? (
        <TicketEmpty icon={Inbox} title={f.tab === "open" && !f.category && !f.overdue ? "The queue is empty" : "Nothing here"} text={f.tab === "open" ? "No customer is waiting for an answer." : "No requests match these filters."} />
      ) : (
        <>
          <ul className="space-y-2">
            {res.data.items.map((t) => (
              <li key={t.ticketId}>
                <TicketRow t={t} href={`/admin/support/${t.ticketId}`} deadlines />
              </li>
            ))}
          </ul>
          <Pager page={res.data.page} totalPages={res.data.totalPages} href={(p) => href(f, p)} />
        </>
      )}
    </div>
  );
}
