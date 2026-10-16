import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddressForm } from "@/components/addresses/AddressForm";
import { loadAddresses } from "@/lib/addresses/data";
import { listVersion } from "@/lib/addresses/format";
import { MAX_ADDRESSES } from "@/lib/addresses/types";
import { emptyDraft } from "@/lib/addresses/validation";
import { fullName } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/dal";
import { mapConfig } from "@/lib/maps/config";
import { AddressPageHeader, FormSkeleton, LoadFailed } from "../AddressPageHeader";

export const metadata: Metadata = { title: "Add Address", robots: { index: false, follow: false } };

export default function NewAddressPage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
        <AddressPageHeader back="/account/addresses" backLabel="Saved addresses" title="Add address" subtitle="Where should we deliver?" />
        <Suspense fallback={<FormSkeleton />}>
          <NewAddress />
        </Suspense>
      </div>
    </div>
  );
}

async function NewAddress() {
  const user = await requireRole("customer");
  const list = await loadAddresses("/account/addresses/new");
  if (!list.ok) return <LoadFailed message={list.error.message} />;

  if (list.data.length >= MAX_ADDRESSES) {
    return (
      <div className="rounded-3xl border border-line bg-white px-5 py-6">
        <p className="font-semibold text-ink">You can save up to {MAX_ADDRESSES} addresses.</p>
        <p className="mt-1 text-sm text-muted">Delete one to add another.</p>
        <Link href="/account/addresses" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
          Manage addresses
        </Link>
      </div>
    );
  }

  return (
    <AddressForm
      // A fresh form once the list has changed (e.g. after saving); an unsaved draft is kept otherwise.
      key={listVersion(list.data)}
      addressId={null}
      // Most orders are for yourself, so start with your own name.
      initial={emptyDraft(fullName(user) ?? "")}
      defaultLocked={list.data.length === 0 ? "first" : null}
      map={mapConfig()}
    />
  );
}
