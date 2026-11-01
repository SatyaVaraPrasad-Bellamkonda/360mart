import { ChevronRight, Megaphone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader, PRIMARY_BUTTON } from "@/components/admin/AdminShell";
import { Pager } from "@/components/inventory/SellerHeader";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { count, STATUS_META } from "@/lib/campaigns/format";
import * as api from "@/lib/campaigns/service";
import type { CampaignStatus, CampaignSummary } from "@/lib/campaigns/types";
import { pageFromParam } from "@/lib/inventory/data";
import { when } from "@/lib/orders/format";

export const metadata: Metadata = { title: "Offers & notifications", robots: { index: false, follow: false } };

// ?status= is a named tab (one call with repeated statuses; none = all, newest first).
const TABS = {
  all: { label: "All", statuses: [] },
  active: { label: "Scheduled & sending", statuses: ["SCHEDULED", "SENDING"] },
  draft: { label: "Drafts", statuses: ["DRAFT"] },
  sent: { label: "Sent", statuses: ["SENT"] },
  cancelled: { label: "Cancelled", statuses: ["CANCELLED"] },
} as const satisfies Record<string, { label: string; statuses: CampaignStatus[] }>;
type Tab = keyof typeof TABS;
const isTab = (v: unknown): v is Tab => typeof v === "string" && v in TABS;

function href(tab: Tab, page = 0) {
  const q = new URLSearchParams();
  if (tab !== "all") q.set("status", tab);
  if (page) q.set("page", String(page + 1));
  const s = q.toString();
  return s ? `/admin/campaigns?${s}` : "/admin/campaigns";
}

// /admin/campaigns?status=active&page=2: promotional notifications. One call.
export default function CampaignsPage({ searchParams }: PageProps<"/admin/campaigns">) {
  return (
    <>
      <AdminPageHeader
        title="Offers & notifications"
        subtitle="Send an offer to shoppers' phones and their inbox on the website and app. Order updates go out by themselves; this is for promotions only."
        action={
          <Link href="/admin/campaigns/new" className={PRIMARY_BUTTON}>
            <Plus aria-hidden className="size-4" />
            New campaign
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: Pick<PageProps<"/admin/campaigns">, "searchParams">) {
  await requireRole("admin");
  const sp = await searchParams;
  const tab: Tab = isTab(sp.status) ? sp.status : "all";
  const page = pageFromParam(sp.page);
  const token = await getSessionToken();
  if (!token) return <AdminLoadFailed message="Please login to continue." />;
  const res = await api.listCampaigns(token, [...TABS[tab].statuses], page, 20);

  return (
    <div className="space-y-4">
      <nav aria-label="Campaign status" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {(Object.keys(TABS) as Tab[]).map((t) => {
            const current = t === tab;
            return (
              <li key={t}>
                <Link
                  href={href(t)}
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

      {!res.ok ? (
        <AdminLoadFailed message={res.error.message} />
      ) : res.data.items.length === 0 ? (
        <EmptyOrders icon={Megaphone} title={tab === "all" ? "No campaigns yet" : "Nothing here"} text={tab === "all" ? "Write your first offer: a title, a short message, maybe a picture, and who should get it." : "No campaigns match this filter."}>
          {tab === "all" && (
            <Link href="/admin/campaigns/new" className={`mt-5 ${PRIMARY_BUTTON}`}>
              <Plus aria-hidden className="size-4" />
              New campaign
            </Link>
          )}
        </EmptyOrders>
      ) : (
        <>
          <ul className="space-y-2">
            {res.data.items.map((c) => (
              <li key={c.campaignId}>
                <Row c={c} />
              </li>
            ))}
          </ul>
          <Pager page={res.data.page} totalPages={res.data.totalPages} href={(p) => href(tab, p)} />
        </>
      )}
    </div>
  );
}

function Row({ c }: { c: CampaignSummary }) {
  const meta = STATUS_META[c.status];
  const sentStatus = c.status === "SENT" || c.status === "SENDING" || (c.status === "CANCELLED" && c.targetCount !== null);
  const time = c.status === "DRAFT" ? `Created ${when(c.createdAt)}` : c.sendAt ? `${c.status === "SCHEDULED" ? "Goes out" : "Sent"} ${when(c.sendAt)}` : `Created ${when(c.createdAt)}`;
  return (
    <Link href={`/admin/campaigns/${c.campaignId}`} className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-ink">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-bold text-ink">{c.name}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${meta.tone}`}>
            {c.status === "SENDING" && <span aria-hidden className="size-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse" />}
            {meta.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">{c.title}</p>
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>{time}</span>
          {c.targetCount !== null && <span>{count(c.targetCount)} people</span>}
          {sentStatus && <span>{count(c.sent)} pushed</span>}
          {/* Open rate needs the inbox-only numbers too: shown on the campaign's page. */}
          {sentStatus && <span>{count(c.opened)} opened</span>}
        </p>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-10 w-96 max-w-full animate-pulse rounded-full bg-line/60" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-line/60" />
      ))}
    </div>
  );
}
