import { ArrowRight, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { AccountHero } from "./components/AccountHero";
import { AccountSkeleton, AddressesCard, AddressesCardSkeleton, OrdersCard, OrdersCardSkeleton, SettingsCard } from "./components/AccountSections";
import { ProfileProgress } from "./components/ProfileProgress";

export const metadata: Metadata = { title: "My Account", robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Suspense fallback={<AccountSkeleton />}>
          <ShopperAccount />
        </Suspense>
      </div>
    </div>
  );
}

async function ShopperAccount() {
  const user = await requireRole(SHOPPERS);
  return (
    <div className="space-y-6">
      <AccountHero user={user} />
      <ProfileProgress user={user} />
      {/* Shopkeepers shop here too; their store is one tap away. Customers never see this. */}
      {user.role === "seller" && (
        <Link href="/seller" className="flex items-center gap-4 rounded-3xl bg-ink p-5 text-white transition hover:bg-ink/90">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink">
            <Store aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Your store</span>
            <span className="block text-sm text-white/75">Registration, documents and store details</span>
          </span>
          <ArrowRight aria-hidden className="size-5 shrink-0" />
        </Link>
      )}
      {/* Phones: one column. Desktop: activity on the left, settings in a sidebar. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Suspense fallback={<OrdersCardSkeleton />}>
            <OrdersCard />
          </Suspense>
          {/* Its own boundary: the rest of the page doesn't wait for the address list. */}
          <Suspense fallback={<AddressesCardSkeleton />}>
            <AddressesCard />
          </Suspense>
        </div>
        <SettingsCard />
      </div>
    </div>
  );
}
