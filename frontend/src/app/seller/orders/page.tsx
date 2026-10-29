import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SellerHeader } from "@/components/inventory/SellerHeader";
import { StoreOrdersList } from "@/components/orders/seller/StoreOrdersList";
import { requireRole } from "@/lib/auth/dal";
import { pageFromParam } from "@/lib/inventory/data";
import { loadStoreOrders, STORE_TABS, storeTab, type StoreTab } from "@/lib/orders/data";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

function url(tab: StoreTab, page = 0) {
  const p = new URLSearchParams();
  if (tab !== "new") p.set("tab", tab);
  if (page > 0) p.set("page", String(page + 1));
  const s = p.toString();
  return `/seller/orders${s ? `?${s}` : ""}`;
}

// /seller/orders?tab=active&page=2: one backend call; the list then refreshes itself every 30 s.
export default function SellerOrdersPage({ searchParams }: PageProps<"/seller/orders">) {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <SellerHeader
          title="Orders"
          subtitle="Accept new orders quickly: an order nobody answers is cancelled automatically after 10 minutes."
          action={
            <Link href="/seller/ledger" className="flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink shadow-sm ring-1 ring-line transition hover:ring-ink">
              <Wallet aria-hidden className="size-4" />
              Payments & dues
            </Link>
          }
        />
        <Suspense fallback={<ListSkeleton />}>
          <Orders searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Orders({ searchParams }: Pick<PageProps<"/seller/orders">, "searchParams">) {
  await requireRole("seller");
  const params = await searchParams;
  const tab = storeTab(params.tab);
  const page = pageFromParam(params.page);
  const res = await loadStoreOrders(tab, page, url(tab, page));

  return (
    <div className="space-y-4">
      <nav aria-label="Order status" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-full bg-white p-1 ring-1 ring-line">
          {(Object.keys(STORE_TABS) as StoreTab[]).map((t) => (
            <li key={t}>
              <Link
                href={url(t)}
                aria-current={t === tab ? "page" : undefined}
                className={`flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition ${t === tab ? "bg-ink text-white" : "text-ink/70 hover:text-ink"}`}
              >
                {STORE_TABS[t].label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {res.ok ? (
        // Keyed per tab + page so a new filter starts from the server's copy.
        <StoreOrdersList key={`${tab}-${page}`} tab={tab} initial={res.data} pageHrefs={{ prev: page > 0 ? url(tab, page - 1) : null, next: page + 1 < res.data.totalPages ? url(tab, page + 1) : null }} />
      ) : (
        <p role="alert" className="rounded-3xl bg-white px-5 py-6 text-sm text-red-700 ring-1 ring-line">
          {res.error.message}
        </p>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      <div className="h-12 w-72 animate-pulse rounded-full bg-line/60" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-line/50" />
      ))}
    </div>
  );
}
