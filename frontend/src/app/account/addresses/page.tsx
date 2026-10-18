import type { Metadata } from "next";
import { Suspense } from "react";
import { AddressBook } from "@/components/addresses/AddressBook";
import { loadAddresses } from "@/lib/addresses/data";
import { requireRole } from "@/lib/auth/dal";
import { SHOPPERS } from "@/lib/auth/roles";
import { AddressPageHeader, LoadFailed } from "./AddressPageHeader";

export const metadata: Metadata = { title: "Saved Addresses", robots: { index: false, follow: false } };

export default function AddressesPage({ searchParams }: PageProps<"/account/addresses">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-10">
        <AddressPageHeader back="/account" backLabel="My account" title="Saved addresses" subtitle="Where your orders are delivered." />
        <Suspense fallback={<ListSkeleton />}>
          <Addresses searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Addresses({ searchParams }: Pick<PageProps<"/account/addresses">, "searchParams">) {
  await requireRole(SHOPPERS);
  const [list, { saved }] = await Promise.all([loadAddresses("/account/addresses"), searchParams]);
  if (!list.ok) return <LoadFailed message={list.error.message} />;
  return <AddressBook initial={list.data} saved={saved === "added" || saved === "updated" ? saved : null} />;
}

function ListSkeleton() {
  return (
    <div aria-hidden className="grid gap-4 md:grid-cols-2">
      <div className="h-64 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-64 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
