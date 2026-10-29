import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogUnavailable } from "@/components/catalog/ShopStates";
import { SellerHeader } from "@/components/inventory/SellerHeader";
import { SheetSwitch } from "@/components/inventory/SheetSwitch";
import { SheetTool } from "@/components/inventory/SheetTool";
import { requireRole } from "@/lib/auth/dal";
import { getShopCategories } from "@/lib/catalog/data";

export const metadata: Metadata = { title: "Prices & stock sheet", robots: { index: false, follow: false } };

// /seller/products/price-sheet: change many prices, stock counts and settings at
// once in Excel. Calls: the cached category list on load, a category's
// subcategories when it's opened, then one call per download and per upload.
export default function PriceSheetPage() {
  return (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10">
        <SellerHeader
          title="Update prices & stock in bulk"
          subtitle="Download a sheet, change prices, stock and settings in Excel, and upload it. You can also start selling new sizes this way."
          crumbs={[{ name: "Products & prices", href: "/seller/products" }]}
        />
        <SheetSwitch current="price" />
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
  return <SheetTool kind="price" categories={categories.data} />;
}
