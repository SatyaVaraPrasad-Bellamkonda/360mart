import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogUnavailable } from "@/components/catalog/ShopStates";
import { SellerHeader } from "@/components/inventory/SellerHeader";
import { SheetSwitch } from "@/components/inventory/SheetSwitch";
import { SheetTool } from "@/components/inventory/SheetTool";
import { requireRole } from "@/lib/auth/dal";
import { getShopCategories } from "@/lib/catalog/data";

export const metadata: Metadata = { title: "Deliveries sheet", robots: { index: false, follow: false } };

// /seller/products/batch-sheet: add many deliveries of items with expiry dates
// (milk, bread, curd…) at once. Each filled row becomes one batch, exactly like
// "Add batch" on a product. Same calls as the price sheet.
export default function BatchSheetPage() {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10">
        <SellerHeader
          title="Add deliveries in bulk"
          subtitle="For items with expiry dates (milk, bread, curd…): download a sheet, type in what arrived with its expiry date, and upload it."
          crumbs={[{ name: "Products & prices", href: "/seller/products" }]}
        />
        <SheetSwitch current="batch" />
        <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-3xl bg-line/60" />}>
          <Tool />
        </Suspense>
      </div>
    </div>
  );
}

async function Tool() {
  await requireRole("seller");
  const categories = await getShopCategories();
  if (!categories.ok) return <CatalogUnavailable message={categories.error.message} />;
  return <SheetTool kind="batch" categories={categories.data} />;
}
