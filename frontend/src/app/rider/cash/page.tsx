import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadFailed } from "@/app/account/addresses/AddressPageHeader";
import { CashMeter, RiderPageHeader } from "@/components/delivery/RiderParts";
import { Pager } from "@/components/inventory/SellerHeader";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { loadRiderCash } from "@/lib/delivery/data";
import { money } from "@/lib/delivery/format";
import { when } from "@/lib/orders/format";

export const metadata: Metadata = { title: "Cash in hand", robots: { index: false, follow: false } };

// Cash on delivery the rider holds for 360mart: collected at each handover,
// lowered when they hand it in (recorded by 360mart). One call per page.
export default function RiderCashPage({ searchParams }: PageProps<"/rider/cash">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-page space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <RiderPageHeader title="Cash in hand" subtitle="Cash you collected on delivery belongs to 360mart until you hand it in. Hand it in regularly to stay under your limit." current="/rider/cash" />
        <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-3xl bg-line/60" />}>
          <Cash searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Cash({ searchParams }: Pick<PageProps<"/rider/cash">, "searchParams">) {
  await requireRole("rider");
  const { page: raw } = await searchParams;
  const page = Math.max(0, Number.parseInt(typeof raw === "string" ? raw : "0", 10) || 0);
  const res = await loadRiderCash(page, `/rider/cash${page ? `?page=${page}` : ""}`);
  if (!res.ok) return <LoadFailed message={res.error.message} />;
  const { cashInHand, cashLimit, entries } = res.data;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <section className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Wallet aria-hidden className="size-4 text-brand-deep" />
          You hold
        </p>
        <div className="mt-3">
          <CashMeter cashInHand={cashInHand} cashLimit={cashLimit} />
        </div>
      </section>
      {entries.items.length === 0 ? (
        <EmptyOrders icon={Wallet} title="No cash yet" text="Cash you collect on delivery, and what you hand in, is listed here." />
      ) : (
        <div className="space-y-4">
          <ul className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
            {entries.items.map((e, i) => {
              const inn = e.type === "COLLECTED";
              return (
                <li key={`${e.createdAt}-${i}`} className="flex items-center gap-3 border-b border-line p-4 last:border-b-0 sm:px-5">
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${inn ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                    {inn ? <ArrowDownLeft aria-hidden className="size-5" /> : <ArrowUpRight aria-hidden className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{inn ? `Collected${e.orderNumber ? ` · order ${e.orderNumber}` : ""}` : "Handed in to 360mart"}</p>
                    <p className="truncate text-xs text-muted">{[when(e.createdAt), e.reference].filter(Boolean).join(" · ")}</p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className={`block font-bold ${inn ? "text-ink" : "text-fresh"}`}>
                      {inn ? "+" : "−"} {money(e.amount)}
                    </span>
                    <span className="block text-xs text-muted">Holding {money(e.balanceAfter)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
          <Pager page={page} totalPages={entries.totalPages} href={(p) => (p ? `/rider/cash?page=${p}` : "/rider/cash")} />
        </div>
      )}
    </div>
  );
}
