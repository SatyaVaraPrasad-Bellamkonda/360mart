import { ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { SettlementButton } from "@/components/admin/SettlementButton";
import { Pager } from "@/components/inventory/SellerHeader";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { pageFromParam } from "@/lib/inventory/data";
import { isUuidLike } from "@/lib/inventory/validation";
import { loadLedgerEntries } from "@/lib/orders/data";
import { ACCOUNT_TYPE_LABEL, money, TRANSACTION_LABEL, when } from "@/lib/orders/format";
import { LEDGER_ACCOUNT_TYPES, type LedgerAccountType, type LedgerEntry } from "@/lib/orders/types";

export const metadata: Metadata = { title: "Account statement", robots: { index: false, follow: false } };

// One account's statement (newest first). There's no GET-one account endpoint,
// so the name, type, store and balance come from the list's link (display only;
// the entries themselves are the backend's).
export default function LedgerAccountPage({ params, searchParams }: PageProps<"/admin/ledger/[accountId]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Statement params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Statement({ params, searchParams }: PageProps<"/admin/ledger/[accountId]">) {
  await requireRole("admin");
  const { accountId: raw } = await params;
  const sp = await searchParams;
  const accountId = Number(raw);
  const type: LedgerAccountType | null = typeof sp.type === "string" && (LEDGER_ACCOUNT_TYPES as readonly string[]).includes(sp.type) ? (sp.type as LedgerAccountType) : null;
  const storeId = typeof sp.storeId === "string" && isUuidLike(sp.storeId) ? sp.storeId : null;
  const name = typeof sp.name === "string" && sp.name.trim() ? sp.name.trim().slice(0, 120) : type ? ACCOUNT_TYPE_LABEL[type] : `Account ${raw}`;
  const balance = typeof sp.balance === "string" && Number.isFinite(Number(sp.balance)) ? Number(sp.balance) : null;
  const page = pageFromParam(sp.page);

  const keep = new URLSearchParams();
  for (const [k, v] of Object.entries({ type, storeId, name: typeof sp.name === "string" ? sp.name : null, balance: typeof sp.balance === "string" ? sp.balance : null })) if (v) keep.set(k, v);
  const pageHref = (p: number) => {
    const q = new URLSearchParams(keep);
    if (p) q.set("page", String(p + 1));
    return `/admin/ledger/${raw}?${q}`;
  };

  const res = await loadLedgerEntries(accountId, page, pageHref(page));
  if (res.ok && !res.data) notFound();
  const crumbs = [{ name: "Ledger", href: type ? `/admin/ledger?type=${type}` : "/admin/ledger" }];
  const isStore = type === "STORE" && !!storeId;
  // The newest entry's balance is the latest; the link's value is only a fallback.
  const latest = res.ok && res.data && page === 0 && res.data.items[0] ? res.data.items[0].balanceAfter : balance;

  return (
    <>
      <AdminPageHeader
        title={name}
        subtitle={type ? ACCOUNT_TYPE_LABEL[type] : undefined}
        crumbs={crumbs}
        action={isStore ? <SettlementButton storeId={storeId} storeName={name} /> : undefined}
      />
      <div className="space-y-4">
        {latest != null && (
          <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
            <p className="text-sm text-muted">Balance</p>
            <p className="mt-1 text-3xl font-extrabold text-ink">{money(latest)}</p>
            {isStore && <p className="mt-1 text-sm text-muted">{latest > 0 ? "The store owes 360mart this amount." : latest < 0 ? "360mart owes the store this amount." : "Nothing is owed either way."}</p>}
            {isStore && (
              <Link href={`/admin/orders?storeId=${storeId}`} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-ink hover:underline">
                This store&apos;s orders
              </Link>
            )}
          </div>
        )}
        {!res.ok ? (
          <AdminLoadFailed message={res.error.message} />
        ) : !res.data || res.data.items.length === 0 ? (
          <EmptyOrders icon={ReceiptText} title="No entries yet" text="Commission on delivered cash orders and recorded settlements appear here." />
        ) : (
          <>
            <Entries entries={res.data.items} />
            <Pager page={res.data.page} totalPages={res.data.totalPages} href={pageHref} />
          </>
        )}
      </div>
    </>
  );
}

/** Table on wider screens, cards on phones. DEBIT raises what's owed, CREDIT lowers it. */
function Entries({ entries }: { entries: LedgerEntry[] }) {
  const amount = (e: LedgerEntry) => (
    <span className={`font-bold ${e.direction === "CREDIT" ? "text-fresh" : "text-ink"}`}>
      {e.direction === "CREDIT" ? "− " : "+ "}
      {money(e.amount)}
    </span>
  );
  const order = (e: LedgerEntry) =>
    e.orderId && e.orderNumber ? (
      <Link href={`/admin/orders/${e.orderId}`} className="font-semibold text-ink underline-offset-2 hover:underline">
        {e.orderNumber}
      </Link>
    ) : null;

  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl bg-white ring-1 ring-line sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Entry</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              <th className="px-4 py-3 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.transactionId} className="border-b border-line align-top last:border-b-0">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{when(e.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-ink">{TRANSACTION_LABEL[e.transactionType] ?? e.transactionType}</span>
                  <span className="block text-muted">{e.description}</span>
                  {order(e)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">{amount(e)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-ink">{money(e.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 sm:hidden">
        {entries.map((e) => (
          <li key={e.transactionId} className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{TRANSACTION_LABEL[e.transactionType] ?? e.transactionType}</span>
                <span className="block text-xs text-muted">{when(e.createdAt)}</span>
              </span>
              <span className="shrink-0 text-right">{amount(e)}</span>
            </div>
            <p className="mt-2 break-words text-sm text-muted">{e.description}</p>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span>{order(e)}</span>
              <span className="text-muted">
                Balance <span className="font-semibold text-ink">{money(e.balanceAfter)}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Skeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-20 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-28 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-72 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
