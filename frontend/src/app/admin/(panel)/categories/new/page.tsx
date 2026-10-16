import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { requireRole } from "@/lib/auth/dal";
import { loadCategoryTree } from "@/lib/catalog/data";
import { emptyDraft, parseCategoryId } from "@/lib/catalog/validation";
import { CategoryFormSkeleton } from "../CategoryFormSkeleton";

export const metadata: Metadata = { title: "Add category" };

// /admin/categories/new: a top-level category; ?parent=12: a subcategory of category 12.
export default function NewCategoryPage({ searchParams }: PageProps<"/admin/categories/new">) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader crumbs={[{ name: "Categories", href: "/admin/categories" }]} title="Add category" subtitle="It appears in the shop as soon as you save it (unless you hide it)." />
      <Suspense fallback={<CategoryFormSkeleton />}>
        <NewCategory searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewCategory({ searchParams }: Pick<PageProps<"/admin/categories/new">, "searchParams">) {
  await requireRole("admin");
  const [tree, { parent }] = await Promise.all([loadCategoryTree(), searchParams]);
  if (!tree.ok) return <AdminLoadFailed message={tree.error.message} />;

  const parents = tree.data.map(({ category: { categoryId, name, slug } }) => ({ categoryId, name, slug }));
  const parentId = parseCategoryId(parent);
  const chosen = parents.some((p) => p.categoryId === parentId) ? parentId : null;
  return (
    <CategoryForm
      // A new, empty form for each parent (and after every save: the list changes).
      key={`${chosen ?? "top"}#${parents.length}`}
      categoryId={null}
      initial={emptyDraft(chosen)}
      parents={parents}
      currentImageUrl={null}
      childCount={0}
    />
  );
}
