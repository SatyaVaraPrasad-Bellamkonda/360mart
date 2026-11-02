import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { AdminTicketView } from "@/components/support/AdminTicketView";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { getAdminOrder } from "@/lib/orders/order-service";
import { loadAdminTicket } from "@/lib/support/data";

export const metadata: Metadata = { title: "Support request", robots: { index: false, follow: false } };

// /admin/support/[id]: one request (1 call) + its order for the total, so a
// refund can't be recorded above it (1 more call, only when there's an order).
export default function AdminTicketPage({ params }: PageProps<"/admin/support/[ticketId]">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-[40rem] animate-pulse rounded-3xl bg-line/60" />}>
      <Ticket params={params} />
    </Suspense>
  );
}

async function Ticket({ params }: Pick<PageProps<"/admin/support/[ticketId]">, "params">) {
  await requireRole("admin");
  const { ticketId } = await params;
  const res = await loadAdminTicket(ticketId, `/admin/support/${ticketId}`);
  if (!res.ok) return <AdminLoadFailed message={res.error.message} />;
  if (!res.data) notFound();
  const t = res.data;
  const token = t.orderId ? await getSessionToken() : null;
  const order = t.orderId && token ? await getAdminOrder(token, t.orderId) : null;
  return (
    <div className="space-y-6">
      <AdminPageHeader title={t.ticketNumber} crumbs={[{ name: "Support queue", href: "/admin/support" }]} />
      <AdminTicketView key={t.ticketId} initial={t} order={order?.ok ? { total: order.data.grandTotal, status: order.data.status } : null} />
    </div>
  );
}
