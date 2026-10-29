import { ArrowRight, PartyPopper, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Pager } from "@/components/inventory/SellerHeader";
import { EmptyOrders, OrderRow } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { pageFromParam } from "@/lib/inventory/data";
import { loadMyOrders } from "@/lib/orders/data";
import { AddressPageHeader, LoadFailed } from "../addresses/AddressPageHeader";

export const metadata: Metadata = { title: "Your Orders", robots: { index: false, follow: false } };

// /account/orders: every order, newest first (one call per page). After a
// checkout with several stores, ?placed=N shows the "orders placed" banner.
export default function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-10">
        <AddressPageHeader back="/account" backLabel="My account" title="Your orders" subtitle="Track open orders, see past ones and get invoices." />
        <Suspense fallback={<ListSkeleton />}>
          <Orders searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Orders({ searchParams }: Pick<PageProps<"/account/orders">, "searchParams">) {
  await requireRole(SHOPPERS);
  const { page, placed } = await searchParams;
  const p = pageFromParam(page);
  const list = await loadMyOrders(p, "/account/orders");
  if (!list.ok) return <LoadFailed message={list.error.message} />;
  const placedCount = Number(placed);

  return (
    <div className="space-y-4">
      {placedCount > 0 && p === 0 && (
        <div role="status" className="flex items-center gap-3 rounded-3xl bg-fresh p-5 text-white motion-safe:animate-pop-in">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <PartyPopper aria-hidden className="size-6" />
          </span>
          <div>
            <p className="font-bold">{placedCount === 1 ? "Order placed" : `${placedCount} orders placed`}</p>
            <p className="text-sm text-white/85">Each store will accept its order in a few minutes. Open an order to track it and see its delivery code.</p>
          </div>
        </div>
      )}
      {list.data.items.length === 0 ? (
        <EmptyOrders icon={ShoppingBag} title="No orders yet" text="When you order from neighbourhood stores, you can track it here.">
          <Link href="/categories" className="mt-5 flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85">
            Start shopping
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </EmptyOrders>
      ) : (
        <ul className="space-y-3">
          {list.data.items.map((o) => (
            <li key={o.orderId}>
              <OrderRow order={o} href={`/account/orders/${o.orderId}`} who="store" />
            </li>
          ))}
        </ul>
      )}
      <Pager page={list.data.page} totalPages={list.data.totalPages} href={(n) => (n === 0 ? "/account/orders" : `/account/orders?page=${n + 1}`)} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-line/60" />
      ))}
    </div>
  );
}
