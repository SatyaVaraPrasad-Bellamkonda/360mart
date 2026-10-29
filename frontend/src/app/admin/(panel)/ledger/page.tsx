import { ChevronRight, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { Pager } from "@/components/inventory/SellerHeader";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { pageFromParam } from "@/lib/inventory/data";
import { loadLedgerAccounts } from "@/lib/orders/data";
import { ACCOUNT_TYPE_LABEL, money, when } from "@/lib/orders/format";
import { LEDGER_ACCOUNT_TYPES, type LedgerAccount, type LedgerAccountType } from "@/lib/orders/types";

export const metadata: Metadata = { title: "Ledger", robots: { index: false, follow: false } };

const isType = (v: unknown): v is LedgerAccountType => typeof v === "string" && (LEDGER_ACCOUNT_TYPES as readonly string[]).includes(v);
const listHref = (type: LedgerAccountType, page = 0) => `/admin/ledger?type=${type}${page ? `&page=${page + 1}` : ""}`;

// /admin/ledger?type=STORE: the money accounts with their balances. One call.
export default function AdminLedgerPage({ searchParams }: PageProps<"/admin/ledger">) {
  return (
    <>
      <AdminPageHeader title="Ledger" subtitle="What each store owes 360mart (commission on cash orders) and the settlements recorded." />
      <Suspense fallback={<ListSkeleton />}>
        <Accounts searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Accounts({ searchParams }: Pick<PageProps<"/admin/ledger">, "searchParams">) {
  await requireRole("admin");
  const sp = await searchParams;
  const type: LedgerAccountType = isType(sp.type) ? sp.type : "STORE";
  const page = pageFromParam(sp.page);
  const res = await loadLedgerAccounts(type, page, listHref(type, page));

  return (
    <div className="space-y-4">
      <nav aria-label="Account type" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {LEDGER_ACCOUNT_TYPES.map((t) => (
            <li key={t}>
              <Link
                href={listHref(t)}
                aria-current={t === type ? "page" : undefined}
                className={`flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${t === type ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink"}`}
              >
                {ACCOUNT_TYPE_LABEL[t]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {type === "STORE" && <p className="text-sm text-muted">A positive balance means the store owes 360mart; a negative one means 360mart owes the store.</p>}

      {!res.ok ? (
        <AdminLoadFailed message={res.error.message} />
      ) : res.data.items.length === 0 ? (
        <EmptyOrders icon={Wallet} title="No accounts yet" text="Accounts appear once money is recorded for them, for example commission on a delivered order." />
      ) : (
        <>
          <ul className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
            {res.data.items.map((a) => (
              <AccountRow key={a.accountId} account={a} />
            ))}
          </ul>
          <Pager page={res.data.page} totalPages={res.data.totalPages} href={(p) => listHref(type, p)} />
        </>
      )}
    </div>
  );
}

function AccountRow({ account: a }: { account: LedgerAccount }) {
  const name = a.storeName ?? ACCOUNT_TYPE_LABEL[a.accountType];
  // No GET-one account endpoint: the statement page gets its heading from the link.
  const q = new URLSearchParams({ type: a.accountType, name, balance: String(a.balance) });
  if (a.storeId) q.set("storeId", a.storeId);
  return (
    <li className="border-b border-line last:border-b-0">
      <Link href={`/admin/ledger/${a.accountId}?${q}`} className="flex items-center gap-4 p-4 transition hover:bg-surface sm:px-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Wallet aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">{name}</span>
          <span className="block text-xs text-muted">Updated {when(a.updatedAt)}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block font-extrabold ${a.balance > 0 ? "text-ink" : a.balance < 0 ? "text-fresh" : "text-muted"}`}>{money(a.balance)}</span>
          <span className="block text-xs text-muted">Balance</span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-10 w-96 max-w-full animate-pulse rounded-full bg-line/60" />
      <div className="h-72 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
