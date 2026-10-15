import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth/dal";
import { AccountHero } from "./components/AccountHero";
import { AccountSkeleton, AddressesCard, OrdersCard, SettingsCard } from "./components/AccountSections";
import { ProfileProgress } from "./components/ProfileProgress";

export const metadata: Metadata = { title: "My Account", robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Suspense fallback={<AccountSkeleton />}>
          <CustomerAccount />
        </Suspense>
      </div>
    </div>
  );
}

async function CustomerAccount() {
  const user = await requireRole("customer");
  return (
    <div className="space-y-6">
      <AccountHero user={user} />
      <ProfileProgress user={user} />
      {/* Phones: one column. Desktop: activity on the left, settings in a sidebar. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <OrdersCard />
          <AddressesCard />
        </div>
        <SettingsCard />
      </div>
    </div>
  );
}
