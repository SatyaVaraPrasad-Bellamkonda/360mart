import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { AdminOrderView } from "@/components/admin/AdminOrderView";
import { requireRole } from "@/lib/auth/dal";
import { loadAdminOrder } from "@/lib/orders/data";

export const metadata: Metadata = { title: "Order", robots: { index: false, follow: false } };

const CRUMBS = [{ name: "Orders", href: "/admin/orders" }];

// One backend call: the whole order (items, address, timeline, allowed actions).
export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[orderId]">) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: Pick<PageProps<"/admin/orders/[orderId]">, "params">) {
  await requireRole("admin");
  const { orderId } = await params;
  const res = await loadAdminOrder(orderId, `/admin/orders/${orderId}`);
  if (!res.ok) {
    return (
      <>
        <AdminPageHeader title="Order" crumbs={CRUMBS} />
        <AdminLoadFailed message={res.error.message} />
      </>
    );
  }
  if (!res.data) notFound();
  return (
    <>
      <AdminPageHeader title={`Order ${res.data.orderNumber}`} subtitle={`${res.data.deliveryAddress.name} · ${res.data.storeName}`} crumbs={CRUMBS} />
      <AdminOrderView key={`${res.data.orderId}-${res.data.status}`} initial={res.data} />
    </>
  );
}

function OrderSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-20 animate-pulse rounded-3xl bg-line/60" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        <div className="h-72 animate-pulse rounded-3xl bg-line/60" />
      </div>
    </div>
  );
}
