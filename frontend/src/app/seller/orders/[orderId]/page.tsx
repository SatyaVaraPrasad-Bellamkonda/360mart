import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SellerHeader } from "@/components/inventory/SellerHeader";
import { StoreOrderView } from "@/components/orders/seller/StoreOrderView";
import { requireRole } from "@/lib/auth/dal";
import { loadStoreOrder } from "@/lib/orders/data";

export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

// One backend call; the view then refreshes itself while the order is open.
export default function SellerOrderPage({ params }: PageProps<"/seller/orders/[orderId]">) {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <Suspense fallback={<OrderSkeleton />}>
          <Order params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Order({ params }: Pick<PageProps<"/seller/orders/[orderId]">, "params">) {
  await requireRole("seller");
  const { orderId } = await params;
  const res = await loadStoreOrder(orderId, `/seller/orders/${orderId}`);
  if (res.ok && !res.data) notFound();

  return (
    <>
      <SellerHeader title={res.ok && res.data ? `Order ${res.data.orderNumber}` : "Order"} crumbs={[{ name: "Orders", href: "/seller/orders" }]} />
      {res.ok && res.data ? (
        <StoreOrderView key={res.data.orderId} initial={res.data} />
      ) : (
        <p role="alert" className="rounded-3xl bg-white px-5 py-6 text-sm text-red-700 ring-1 ring-line">
          {!res.ok ? res.error.message : ""}
        </p>
      )}
    </>
  );
}

function OrderSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-line/60" />
      <div className="h-40 animate-pulse rounded-3xl bg-line/50" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-72 animate-pulse rounded-3xl bg-line/50" />
        <div className="h-72 animate-pulse rounded-3xl bg-line/50" />
      </div>
    </div>
  );
}
