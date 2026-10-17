import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireRole } from "@/lib/auth/dal";
import { emptyProductDraft } from "@/lib/catalog/product-validation";
import { CategoryFormSkeleton } from "../../categories/CategoryFormSkeleton";
import { loadPicker } from "../picker";

export const metadata: Metadata = { title: "Add product" };

// /admin/products/new?category=3&sub=12: a new product in subcategory 12 of category 3 (the admin can change it).
export default function NewProductPage({ searchParams }: PageProps<"/admin/products/new">) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader crumbs={[{ name: "Products", href: "/admin/products" }]} title="Add product" subtitle="Start with the details. You'll add its sizes (500 g, 1 kg…) on the next screen." />
      <Suspense fallback={<CategoryFormSkeleton />}>
        <NewProduct searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewProduct({ searchParams }: Pick<PageProps<"/admin/products/new">, "searchParams">) {
  await requireRole("admin");
  const { category, sub } = await searchParams;
  const picker = await loadPicker(category, sub);
  if (!picker.ok) return <AdminLoadFailed message={picker.error.message} />;
  const chosen = picker.subcategory?.categoryId ?? 0;
  return <ProductForm key={`${picker.start.categoryId}/${chosen}`} productId={null} initial={emptyProductDraft(chosen)} start={picker.start} currentImageUrl={null} variants={[]} />;
}
