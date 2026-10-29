import { ArrowDownLeft, ArrowUpRight, ReceiptText, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Pager, SellerHeader } from "@/components/inventory/SellerHeader";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { pageFromParam } from "@/lib/inventory/data";
import { loadStoreLedger } from "@/lib/orders/data";
import { money, TRANSACTION_LABEL, when } from "@/lib/orders/format";
import type { LedgerEntry } from "@/lib/orders/types";

export const metadata: Metadata = { title: "Payments & dues", robots: { index: false, follow: false } };

const url = (page: number) => (page > 0 ? `/seller/ledger?page=${page + 1}` : "/seller/ledger");

// The store's account with 360mart: commission owed on cash orders, and the
// settlements that pay it off. One backend call per page.
export default function SellerLedgerPage({ searchParams }: PageProps<"/seller/ledger">) {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <SellerHeader title="Payments & dues" subtitle="Customers pay you in cash, so 360mart's commission on those orders is owed by you. Settlements you pay reduce it." crumbs={[{ name: "Orders", href: "/seller/orders" }]} />
        <Suspense fallback={<LedgerSkeleton />}>
          <Ledger searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Ledger({ searchParams }: Pick<PageProps<"/seller/ledger">, "searchParams">) {
  await requireRole("seller");
  const page = pageFromParam((await searchParams).page);
  const res = await loadStoreLedger(page, url(page));
  if (!res.ok) {
    return (
      <p role="alert" className="rounded-3xl bg-white px-5 py-6 text-sm text-red-700 ring-1 ring-line">
        {res.error.message}
      </p>
    );
  }
  const { amountDue, amountOwedToStore, balance, entries } = res.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={ArrowUpRight} label="You owe 360mart" value={money(amountDue)} tone={amountDue > 0 ? "bg-amber-100 text-amber-800" : "bg-surface text-muted"} />
        <Stat icon={ArrowDownLeft} label="360mart owes you" value={money(amountOwedToStore)} tone={amountOwedToStore > 0 ? "bg-green-100 text-green-800" : "bg-surface text-muted"} />
        <Stat icon={Scale} label="Balance" value={money(balance)} tone="bg-surface text-ink" note={balance === 0 ? "Nothing is owed either way" : undefined} />
      </div>

      {entries.items.length === 0 ? (
        <EmptyOrders icon={ReceiptText} title="No entries yet" text="Commission is 0% for now, so nothing is owed. Entries appear here once a rate is set." />
      ) : (
        <section aria-labelledby="entries-title" className="space-y-3">
          <h2 id="entries-title" className="text-lg font-bold text-ink">
            Statement
          </h2>
          {/* Phones: cards. Wider screens: a table. */}
          <ul className="space-y-2 sm:hidden">
            {entries.items.map((e) => (
              <li key={e.transactionId} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{TRANSACTION_LABEL[e.transactionType] ?? e.transactionType}</p>
                    <p className="text-xs text-muted">{when(e.createdAt)}</p>
                  </div>
                  <Amount e={e} />
                </div>
                <p className="mt-2 break-words text-sm text-muted">{e.description}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted">
                  <OrderLink e={e} />
                  <span>Balance {money(e.balanceAfter)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-3xl bg-white ring-1 ring-line sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.items.map((e) => (
                  <tr key={e.transactionId} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{when(e.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{TRANSACTION_LABEL[e.transactionType] ?? e.transactionType}</td>
                    <td className="px-4 py-3">
                      <p className="break-words text-ink">{e.description}</p>
                      <OrderLink e={e} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Amount e={e} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted">{money(e.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={entries.page} totalPages={entries.totalPages} href={url} />
        </section>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone, note }: { icon: typeof Scale; label: string; value: string; tone: string; note?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-line sm:p-5">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="text-xl font-extrabold text-ink">{value}</p>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
    </div>
  );
}

// DEBIT adds to what the store owes; CREDIT (e.g. a settlement) takes it off.
function Amount({ e }: { e: LedgerEntry }) {
  return e.direction === "DEBIT" ? (
    <span className="whitespace-nowrap font-bold text-amber-700">+ {money(e.amount)} owed</span>
  ) : (
    <span className="whitespace-nowrap font-bold text-fresh">− {money(e.amount)}</span>
  );
}

function OrderLink({ e }: { e: LedgerEntry }) {
  if (!e.orderId) return <span />;
  return (
    <Link href={`/seller/orders/${e.orderId}`} className="-my-2 inline-flex min-h-10 items-center text-xs font-semibold text-brand-deep hover:underline">
      Order {e.orderNumber ?? ""}
    </Link>
  );
}

function LedgerSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-3xl bg-line/50" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-3xl bg-line/50" />
    </div>
  );
}
