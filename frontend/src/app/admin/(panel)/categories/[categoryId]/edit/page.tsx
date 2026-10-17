import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { requireRole } from "@/lib/auth/dal";
import { loadSubcategories, loadTopCategories } from "@/lib/catalog/data";
import { parseCategoryId, toDraft } from "@/lib/catalog/validation";
import { CategoryFormSkeleton } from "../../CategoryFormSkeleton";

export const metadata: Metadata = { title: "Edit category" };

// /admin/categories/12/edit (a top-level category) or /admin/categories/40/edit?parent=12 (a subcategory of 12).
export default function EditCategoryPage({ params, searchParams }: PageProps<"/admin/categories/[categoryId]/edit">) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader crumbs={[{ name: "Categories", href: "/admin/categories" }]} title="Edit category" subtitle="Changes show in the shop as soon as you save." />
      <Suspense fallback={<CategoryFormSkeleton />}>
        <EditCategory params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditCategory({ params, searchParams }: Pick<PageProps<"/admin/categories/[categoryId]/edit">, "params" | "searchParams">) {
  await requireRole("admin");
  const [{ categoryId: raw }, { parent: parentParam }, top] = await Promise.all([params, searchParams, loadTopCategories()]);
  if (!top.ok) return <AdminLoadFailed message={top.error.message} />;

  // There's no "get one category" endpoint, so it's found in a list: the
  // top-level one, or (?parent=, set by the tree's links) its parent's
  // subcategories. One extra call either way, never one per category.
  const id = parseCategoryId(raw);
  const parentId = parseCategoryId(parentParam);
  const parentCategory = top.data.find((c) => c.categoryId === parentId) ?? null;
  const topLevel = parentCategory ? undefined : top.data.find((c) => c.categoryId === id);
  // A subcategory: its siblings hold it. A top-level category: its subcategories (it can't move under another while it has some).
  const listOf = parentCategory ?? topLevel ?? null;
  const subs = id !== null && listOf ? await loadSubcategories(listOf.categoryId) : null;
  if (subs && !subs.ok) return <AdminLoadFailed message={subs.error.message} />;
  const category = parentCategory ? subs?.ok && subs.data.find((c) => c.categoryId === id) : topLevel;
  if (!category) {
    return (
      <div className="rounded-3xl border border-line bg-white px-5 py-6">
        <p className="font-semibold text-ink">This category can&apos;t be opened from this link.</p>
        <p className="mt-1 text-sm text-muted">Open it from the category tree. It may also be hidden from the shop (hidden categories can&apos;t be opened here yet).</p>
        <Link href="/admin/categories" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
          Back to categories
        </Link>
      </div>
    );
  }

  const parents = top.data.filter((c) => c.categoryId !== category.categoryId).map(({ categoryId, name, slug }) => ({ categoryId, name, slug }));
  return (
    <CategoryForm
      // Fresh form for another category, or once this one was saved (here or by another admin).
      key={`${category.categoryId}@${category.updatedAt}`}
      categoryId={category.categoryId}
      initial={toDraft(category)}
      parents={parents}
      currentImageUrl={category.imageUrl}
      childCount={topLevel && subs?.ok ? subs.data.length : 0}
    />
  );
}
