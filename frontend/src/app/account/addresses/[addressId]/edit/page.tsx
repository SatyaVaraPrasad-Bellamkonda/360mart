import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddressForm } from "@/components/addresses/AddressForm";
import { loadAddress } from "@/lib/addresses/data";
import { toDraft } from "@/lib/addresses/validation";
import { requireRole } from "@/lib/auth/dal";
import { mapConfig } from "@/lib/maps/config";
import { AddressPageHeader, FormSkeleton, LoadFailed } from "../../AddressPageHeader";

export const metadata: Metadata = { title: "Edit Address", robots: { index: false, follow: false } };

export default function EditAddressPage({ params }: PageProps<"/account/addresses/[addressId]/edit">) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
        <AddressPageHeader back="/account/addresses" backLabel="Saved addresses" title="Edit address" subtitle="Changes apply to your future orders." />
        <Suspense fallback={<FormSkeleton />}>
          <EditAddress params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function EditAddress({ params }: Pick<PageProps<"/account/addresses/[addressId]/edit">, "params">) {
  await requireRole("customer");
  const { addressId } = await params;
  const loaded = await loadAddress(addressId, `/account/addresses/${encodeURIComponent(addressId)}/edit`);
  if (!loaded.ok) return <LoadFailed message={loaded.error.message} />;

  const address = loaded.data;
  if (!address) {
    return (
      <div className="rounded-3xl border border-line bg-white px-5 py-6">
        <p className="font-semibold text-ink">This address no longer exists.</p>
        <p className="mt-1 text-sm text-muted">It may have been deleted on another device.</p>
        <Link href="/account/addresses" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
          Back to your addresses
        </Link>
      </div>
    );
  }

  return (
    <AddressForm
      // Start fresh for another address, or once this one was saved (here or elsewhere).
      key={`${address.addressId}@${address.modifiedAt}`}
      addressId={address.addressId}
      initial={toDraft(address)}
      defaultLocked={address.isDefault ? "current" : null}
      map={mapConfig()}
    />
  );
}
