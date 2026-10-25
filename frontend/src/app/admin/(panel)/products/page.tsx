import { FolderTree } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader, PRIMARY_BUTTON } from "@/components/admin/AdminShell";
import { ProductList } from "@/components/admin/ProductList";
import { requireRole } from "@/lib/auth/dal";
import { loadProducts } from "@/lib/catalog/data";
import { loadPicker } from "./picker";

export const metadata: Metadata = { title: "Products" };

// /admin/products?category=3&sub=12: the products of subcategory 12 in category 3 (nothing chosen = pick first).
export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <>
      <AdminPageHeader title="Products" subtitle="Products live in subcategories (Alphonso Mango in Fruits › Mangoes). Each has its sizes; stores set prices later." />
      <Suspense fallback={<ListSkeleton />}>
        <Products searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Products({ searchParams }: Pick<PageProps<"/admin/products">, "searchParams">) {
  await requireRole("admin");
  const { category: categoryParam, sub, saved } = await searchParams;
  const picker = await loadPicker(categoryParam, sub);
  if (!picker.ok) return <AdminLoadFailed message={picker.error.message} />;
  const { start, category, subcategory } = picker;

  if (start.categories.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-line">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <FolderTree aria-hidden className="size-8" />
        </span>
        <p className="mt-4 text-lg font-bold text-ink">Add a category first</p>
        <p className="mt-1 max-w-sm text-sm text-muted">Products go inside subcategories, like Mangoes in Fruits. Create them, then come back to add products.</p>
        <Link href="/admin/categories" className={`mt-5 ${PRIMARY_BUTTON}`}>
          Open categories
        </Link>
      </div>
    );
  }

  // Products of the chosen subcategory only (none until one is chosen).
  const products = category && subcategory ? await loadProducts(subcategory.categoryId) : { ok: true as const, data: { items: [], totalItems: 0 } };
  if (!products.ok) return <AdminLoadFailed message={products.error.message} />;

  const version = products.data.items.map((p) => `${p.productId}@${p.updatedAt}:${p.variants.length}`).join("|");
  return (
    <ProductList
      // Fresh state (search, notice, picker) for another subcategory or after a save.
      key={`${category?.categoryId ?? 0}/${subcategory?.categoryId ?? 0}#${version}`}
      start={start}
      selected={category && subcategory ? { category, subcategory } : null}
      products={products.data.items}
      total={products.data.totalItems}
      saved={saved === "updated" ? "updated" : null}
    />
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="h-28 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-80 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
