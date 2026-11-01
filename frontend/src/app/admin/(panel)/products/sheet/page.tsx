import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { ProductSheetTool } from "@/components/admin/ProductSheetTool";
import { requireRole } from "@/lib/auth/dal";
import { loadTopCategories } from "@/lib/catalog/data";

export const metadata: Metadata = { title: "Bulk edit products", robots: { index: false, follow: false } };

// /admin/products/sheet: edit many products and sizes at once in Excel.
// Calls: top-level categories on load, a category's subcategories when it's
// opened, then one call per download and per upload.
export default function ProductSheetPage() {
  return (
    <>
      <AdminPageHeader
        title="Bulk edit products"
        subtitle="Download the products of some categories as an Excel sheet, change or add products and sizes, and upload it back."
        crumbs={[{ name: "Products", href: "/admin/products" }]}
      />
      <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-3xl bg-line/60" />}>
        <Tool />
      </Suspense>
    </>
  );
}

async function Tool() {
  await requireRole("admin");
  const categories = await loadTopCategories();
  if (!categories.ok) return <AdminLoadFailed message={categories.error.message} />;
  return <ProductSheetTool categories={categories.data.map((c) => ({ id: c.categoryId, name: c.name }))} />;
}
