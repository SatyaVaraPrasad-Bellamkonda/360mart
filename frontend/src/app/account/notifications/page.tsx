import { ArrowRight, BellRing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Pager } from "@/components/inventory/SellerHeader";
import { InboxList } from "@/components/notifications/InboxList";
import { OffersSwitch } from "@/components/notifications/OffersSwitch";
import { EmptyOrders } from "@/components/orders/OrderParts";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { getSessionToken } from "@/lib/auth/session";
import * as api from "@/lib/campaigns/service";
import { pageFromParam } from "@/lib/inventory/data";
import { AddressPageHeader, LoadFailed } from "../addresses/AddressPageHeader";

export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

const SIZE = 20;
const href = (page: number) => (page ? `/account/notifications?page=${page + 1}` : "/account/notifications");

// /account/notifications: offers sent to this account (last 30 days, ended
// offers left out, newest first) and the "Offers & promotions" switch. Two calls.
export default function NotificationsPage({ searchParams }: PageProps<"/account/notifications">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
        <AddressPageHeader back="/account" backLabel="My account" title="Notifications" subtitle="Offers from the last 30 days. Ended offers drop off by themselves." />
        <Suspense fallback={<InboxSkeleton />}>
          <Inbox searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Inbox({ searchParams }: Pick<PageProps<"/account/notifications">, "searchParams">) {
  await requireRole(SHOPPERS);
  const { page: raw } = await searchParams;
  const page = pageFromParam(raw);
  const token = await getSessionToken();
  if (!token) return <LoadFailed message="Please log in again to continue." />;
  const [list, prefs] = await Promise.all([api.inbox(token, page, SIZE), api.getPreferences(token)]);

  return (
    <div className="space-y-6">
      <OffersSwitch initial={prefs.ok ? prefs.data.offers : null} />
      {!list.ok ? (
        <LoadFailed message={list.error.message} />
      ) : list.data.items.length === 0 ? (
        <EmptyOrders icon={BellRing} title="No offers right now" text="When 360mart or a store near you has a deal, it shows up here.">
          <Link href="/categories" className="mt-5 flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/85">
            Browse categories
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </EmptyOrders>
      ) : (
        <>
          <InboxList key={page} items={list.data.items} complete={list.data.totalPages <= 1} />
          <Pager page={list.data.page} totalPages={list.data.totalPages} href={href} />
        </>
      )}
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="h-28 animate-pulse rounded-3xl bg-line/60" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-3xl bg-line/60" />
      ))}
    </div>
  );
}
