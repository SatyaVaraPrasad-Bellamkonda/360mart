import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListingDetail } from "@/components/inventory/ListingDetail";
import { SellerHeader } from "@/components/inventory/SellerHeader";
import { requireRole } from "@/lib/auth/dal";
import { loadListingDetail } from "@/lib/inventory/data";

export const metadata: Metadata = { title: "Product", robots: { index: false, follow: false } };

const CRUMBS = [{ name: "Products", href: "/seller/products" }];

// One product the store sells: two backend calls side by side (the listing, and
// the first page of its stock history). Everything else loads when it's opened.
export default function ListingPage({ params }: PageProps<"/seller/products/[listingId]">) {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
        <Suspense fallback={<DetailSkeleton />}>
          <Detail params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Detail({ params }: Pick<PageProps<"/seller/products/[listingId]">, "params">) {
  await requireRole("seller");
  const { listingId } = await params;
  const res = await loadListingDetail(listingId, `/seller/products/${listingId}`);
  if (!res.ok) {
    return (
      <>
        <SellerHeader title="Product" crumbs={CRUMBS} />
        <p role="alert" className="rounded-3xl border border-line bg-white px-5 py-6 text-sm text-red-700">
          {res.error.message}
        </p>
      </>
    );
  }
  if (!res.data) {
    return (
      <>
        <SellerHeader title="Product not found" crumbs={CRUMBS} />
        <div className="rounded-3xl bg-white px-5 py-6 ring-1 ring-line">
          <p className="font-semibold text-ink">This product isn&apos;t in your store.</p>
          <Link href="/seller/products" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
            Back to products
          </Link>
        </div>
      </>
    );
  }
  const { listing, movements } = res.data;
  return (
    <>
      <SellerHeader title={listing.productName} crumbs={CRUMBS} />
      <ListingDetail initial={listing} initialMovements={movements} />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-16 w-72 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-56 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-80 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
