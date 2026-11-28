import { History } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadFailed } from "@/app/account/addresses/AddressPageHeader";
import { RiderPageHeader, TaskStatusPill } from "@/components/delivery/RiderParts";
import { Pager } from "@/components/inventory/SellerHeader";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { loadRiderTasks } from "@/lib/delivery/data";
import { money } from "@/lib/delivery/format";
import { when } from "@/lib/orders/format";

export const metadata: Metadata = { title: "Past deliveries", robots: { index: false, follow: false } };

// The rider's deliveries, newest first, 20 per page (one call per page).
export default function RiderDeliveriesPage({ searchParams }: PageProps<"/rider/deliveries">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-page space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <RiderPageHeader title="Past deliveries" subtitle="Every delivery you accepted, with the cash you collected." current="/rider/deliveries" />
        <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-3xl bg-line/60" />}>
          <List searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function List({ searchParams }: Pick<PageProps<"/rider/deliveries">, "searchParams">) {
  await requireRole("rider");
  const { page: raw } = await searchParams;
  const page = Math.max(0, Number.parseInt(typeof raw === "string" ? raw : "0", 10) || 0);
  const res = await loadRiderTasks(page, `/rider/deliveries${page ? `?page=${page}` : ""}`);
  if (!res.ok) return <LoadFailed message={res.error.message} />;
  const { items, totalPages } = res.data;
  if (!items.length) return <EmptyOrders icon={History} title="No deliveries yet" text="Deliveries you accept in the 360mart app appear here." />;
  return (
    <div className="space-y-4">
      <ul className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
        {items.map((t) => (
          <li key={t.taskId} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line p-4 last:border-b-0 sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-ink">Order {t.orderNumber}</p>
                <TaskStatusPill status={t.status} />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">{t.storeName}</p>
              <p className="mt-0.5 text-xs text-muted">{[t.acceptedAt && `Accepted ${when(t.acceptedAt)}`, t.finishedAt && `finished ${when(t.finishedAt)}`].filter(Boolean).join(" · ")}</p>
            </div>
            {t.cashCollected != null && t.cashCollected > 0 && (
              <p className="shrink-0 text-right">
                <span className="block text-xs text-muted">Cash collected</span>
                <span className="font-bold text-ink">{money(t.cashCollected)}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
      <Pager page={page} totalPages={totalPages} href={(p) => (p ? `/rider/deliveries?page=${p}` : "/rider/deliveries")} />
    </div>
  );
}
