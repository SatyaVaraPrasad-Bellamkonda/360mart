import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InvoiceView } from "@/components/orders/InvoiceView";
import { requireRole } from "@/lib/auth/dal";
import { loadStoreInvoice } from "@/lib/orders/data";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

// Issued once the order is delivered (404 before that).
export default function SellerInvoicePage({ params }: PageProps<"/seller/orders/[orderId]/invoice">) {
  return (
    <div className="min-h-full bg-surface print:bg-white">
      <Suspense fallback={<div aria-hidden className="mx-auto my-10 h-[32rem] max-w-4xl animate-pulse rounded-3xl bg-line/50" />}>
        <Invoice params={params} />
      </Suspense>
    </div>
  );
}

async function Invoice({ params }: Pick<PageProps<"/seller/orders/[orderId]/invoice">, "params">) {
  await requireRole("seller");
  const { orderId } = await params;
  const res = await loadStoreInvoice(orderId, `/seller/orders/${orderId}/invoice`);
  if (res.ok && !res.data) notFound();
  if (!res.ok || !res.data) {
    return (
      <p role="alert" className="mx-auto my-10 max-w-4xl rounded-3xl bg-white px-5 py-6 text-sm text-red-700 ring-1 ring-line">
        {!res.ok ? res.error.message : ""}
      </p>
    );
  }
  return <InvoiceView invoice={res.data} backHref={`/seller/orders/${orderId}`} backLabel="Back to the order" />;
}
