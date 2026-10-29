import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InvoiceView } from "@/components/orders/InvoiceView";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { loadMyInvoice } from "@/lib/orders/data";
import { LoadFailed } from "../../../addresses/AddressPageHeader";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

// The order's invoice, issued once it's delivered (404 before that).
export default function InvoicePage({ params }: PageProps<"/account/orders/[orderId]/invoice">) {
  return (
    <div className="bg-surface print:bg-white">
      <Suspense fallback={<div aria-hidden className="mx-auto my-10 h-[40rem] max-w-4xl animate-pulse rounded-3xl bg-line/60" />}>
        <Invoice params={params} />
      </Suspense>
    </div>
  );
}

async function Invoice({ params }: Pick<PageProps<"/account/orders/[orderId]/invoice">, "params">) {
  await requireRole(SHOPPERS);
  const { orderId } = await params;
  const res = await loadMyInvoice(orderId, `/account/orders/${orderId}/invoice`);
  if (!res.ok) return <div className="mx-auto max-w-4xl px-4 py-10"><LoadFailed message={res.error.message} /></div>;
  if (!res.data) notFound();
  return <InvoiceView invoice={res.data} backHref={`/account/orders/${orderId}`} backLabel="Back to order" />;
}
