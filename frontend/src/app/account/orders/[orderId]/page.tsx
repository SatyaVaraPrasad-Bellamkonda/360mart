import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CustomerOrderView } from "@/components/orders/CustomerOrderView";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { loadMyOrder } from "@/lib/orders/data";
import { LoadFailed } from "../../addresses/AddressPageHeader";

export const metadata: Metadata = { title: "Order Details", robots: { index: false, follow: false } };

// One order (one call): live progress, delivery code, items and bill. The
// order view polls for changes while the order is open (no push updates yet).
export default function OrderPage({ params, searchParams }: PageProps<"/account/orders/[orderId]">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-3xl bg-line/60" />}>
          <Order params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Order({ params, searchParams }: Pick<PageProps<"/account/orders/[orderId]">, "params" | "searchParams">) {
  await requireRole(SHOPPERS);
  const [{ orderId }, { placed }] = await Promise.all([params, searchParams]);
  const res = await loadMyOrder(orderId, `/account/orders/${orderId}`);
  if (!res.ok) return <LoadFailed message={res.error.message} />;
  if (!res.data) notFound();
  return <CustomerOrderView key={res.data.orderId} initial={res.data} justPlaced={placed === "1"} />;
}
