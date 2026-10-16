import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { requireRole } from "@/lib/auth/dal";
import { findInTree, loadCategoryTree } from "@/lib/catalog/data";
import { parseCategoryId, toDraft } from "@/lib/catalog/validation";
import { CategoryFormSkeleton } from "../../CategoryFormSkeleton";

export const metadata: Metadata = { title: "Edit category" };

export default function EditCategoryPage({ params }: PageProps<"/admin/categories/[categoryId]/edit">) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader crumbs={[{ name: "Categories", href: "/admin/categories" }]} title="Edit category" subtitle="Changes show in the shop as soon as you save." />
      <Suspense fallback={<CategoryFormSkeleton />}>
        <EditCategory params={params} />
      </Suspense>
    </div>
  );
}

async function EditCategory({ params }: Pick<PageProps<"/admin/categories/[categoryId]/edit">, "params">) {
  await requireRole("admin");
  const [{ categoryId: raw }, tree] = await Promise.all([params, loadCategoryTree()]);
  if (!tree.ok) return <AdminLoadFailed message={tree.error.message} />;

  // There is no "get one category" endpoint yet, so it's found in the tree.
  const id = parseCategoryId(raw);
  const found = id === null ? null : findInTree(tree.data, id);
  if (!found) {
    return (
      <div className="rounded-3xl border border-line bg-white px-5 py-6">
        <p className="font-semibold text-ink">This category isn&apos;t in the list.</p>
        <p className="mt-1 text-sm text-muted">It may not exist, or it is hidden from the shop (hidden categories can&apos;t be opened here yet).</p>
        <Link href="/admin/categories" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
          Back to categories
        </Link>
      </div>
    );
  }

  const { category } = found;
  const node = tree.data.find((n) => n.category.categoryId === category.categoryId);
  const parents = tree.data
    .filter((n) => n.category.categoryId !== category.categoryId)
    .map(({ category: { categoryId, name, slug } }) => ({ categoryId, name, slug }));
  return (
    <CategoryForm
      // Fresh form for another category, or once this one was saved (here or by another admin).
      key={`${category.categoryId}@${category.updatedAt}`}
      categoryId={category.categoryId}
      initial={toDraft(category)}
      parents={parents}
      currentImageUrl={category.imageUrl}
      childCount={node?.children.length ?? 0}
    />
  );
}
