import { CalendarX2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TicketEmpty } from "@/components/support/SupportParts";
import { TicketForm, type FormOrder } from "@/components/support/TicketForm";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { isUuidLike } from "@/lib/inventory/validation";
import { loadMyOrder } from "@/lib/orders/data";
import type { CustomerOrder } from "@/lib/orders/types";
import { categoriesFor, GENERAL_CATEGORIES } from "@/lib/support/types";
import { receivedOf } from "@/lib/support/validation";
import { AddressPageHeader, FormSkeleton, LoadFailed } from "../../addresses/AddressPageHeader";

export const metadata: Metadata = { title: "New request", robots: { index: false, follow: false } };

// /account/support/new: a general question (no backend call), or
// ?orderId= a problem with that order (one call: the order, for its items and
// the problems it can still report).
export default function NewRequestPage({ searchParams }: PageProps<"/account/support/new">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10">
        <Suspense fallback={<FormSkeleton />}>
          <NewRequest searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

// The order's own clock check (the backend checks again when it's sent).
const allowedNow = (order: CustomerOrder) => categoriesFor(order, Date.now());

async function NewRequest({ searchParams }: Pick<PageProps<"/account/support/new">, "searchParams">) {
  await requireRole(SHOPPERS);
  const { orderId } = await searchParams;

  if (typeof orderId !== "string" || !orderId) {
    return (
      <>
        <AddressPageHeader back="/account/support" backLabel="Help & support" title="How can we help?" subtitle="For a problem with an order, open the order and tap Get help: we'll see the items and the store." />
        <TicketForm order={null} categories={GENERAL_CATEGORIES} />
      </>
    );
  }

  if (!isUuidLike(orderId)) notFound();
  const res = await loadMyOrder(orderId, `/account/support/new?orderId=${orderId}`);
  if (!res.ok) return <LoadFailed message={res.error.message} />;
  if (!res.data) notFound();
  const order = res.data;
  const categories = allowedNow(order);
  const back = `/account/orders/${order.orderId}`;

  if (categories.length === 0) {
    return (
      <>
        <AddressPageHeader back={back} backLabel={`Order ${order.orderNumber}`} title="Get help with this order" subtitle={`From ${order.store.name}`} />
        <TicketEmpty icon={CalendarX2} title="This order can't be reported any more" text="Problems with items can be reported within 48 hours of delivery, delivery problems within 7 days, and other questions within 30 days of ordering. You can still write to us without choosing the order.">
          <Link href="/account/support/new" className="mt-5 flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
            Contact support
          </Link>
        </TicketEmpty>
      </>
    );
  }

  const formOrder: FormOrder = {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    storeName: order.store.name,
    // Only what actually arrived can be reported (none sent = nothing to report).
    items: order.items.filter((i) => receivedOf(i) > 0).map((i) => ({ listingId: i.listingId, productName: i.productName, variantLabel: i.variantLabel, imageUrl: i.imageUrl, received: receivedOf(i) })),
  };
  return (
    <>
      <AddressPageHeader back={back} backLabel={`Order ${order.orderNumber}`} title="Get help with this order" subtitle="Choose what went wrong. We reply within 48 hours." />
      <TicketForm order={formOrder} categories={categories} />
    </>
  );
}
