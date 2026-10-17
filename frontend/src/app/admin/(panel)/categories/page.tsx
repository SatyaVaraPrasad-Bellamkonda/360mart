import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryTree } from "@/components/admin/CategoryTree";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { requireRole } from "@/lib/auth/dal";
import { loadSubcategories, loadTopCategories } from "@/lib/catalog/data";
import { parseCategoryId } from "@/lib/catalog/validation";

export const metadata: Metadata = { title: "Categories" };

export default function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  return (
    <>
      <AdminPageHeader
        title="Categories"
        subtitle="Two levels: categories (Fruits) and their subcategories (Mangoes). Products go in subcategories."
        action={
          <Link href="/admin/categories/new" className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
            <Plus aria-hidden className="size-4" />
            Add category
          </Link>
        }
      />
      <Suspense fallback={<TreeSkeleton />}>
        <Categories searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Categories({ searchParams }: Pick<PageProps<"/admin/categories">, "searchParams">) {
  await requireRole("admin");
  const { saved, open } = await searchParams;
  // The categories (one call), plus the subcategories of ?open= (one more: the branch just saved into).
  const top = await loadTopCategories();
  if (!top.ok) return <AdminLoadFailed message={top.error.message} />;
  const openId = parseCategoryId(open);
  const opened = openId !== null && top.data.some((c) => c.categoryId === openId) ? await loadSubcategories(openId) : null;
  if (opened && !opened.ok) return <AdminLoadFailed message={opened.error.message} />;
  // Next keeps visited pages alive with their state; a new key after a save starts fresh (and shows "saved").
  const version = [...top.data, ...(opened?.ok ? opened.data : [])].map((c) => `${c.categoryId}@${c.updatedAt}`).join("|");
  return (
    <CategoryTree
      key={`${openId ?? 0}#${version}`}
      categories={top.data}
      open={opened?.ok ? { categoryId: openId!, children: opened.data } : null}
      saved={saved === "added" || saved === "updated" ? saved : null}
    />
  );
}

function TreeSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      <div className="h-12 animate-pulse rounded-xl bg-line/60" />
      <div className="h-40 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-40 animate-pulse rounded-3xl bg-line/60" />
    </div>
  );
}
