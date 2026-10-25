import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoadFailed, AdminPageHeader } from "@/components/admin/AdminShell";
import { PageEditor } from "@/components/admin/page-editor/PageEditor";
import { requireRole } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { getCategoryPageById, loadSubcategories, loadTopCategories } from "@/lib/catalog/data";
import { categoryPath, CUSTOM_CATEGORY_PAGES, parseCategoryId } from "@/lib/catalog/validation";
import * as pageApi from "@/lib/category-page/service";

export const metadata: Metadata = { title: "Design category page" };

// /admin/categories/12/design (a top-level category) or /admin/categories/40/design?parent=12.
// Calls: categories (+ the parent's subcategories) to find it (there's no
// get-one endpoint), the editor's data, and the cached shop page for live counts.
export default function DesignPage({ params, searchParams }: PageProps<"/admin/categories/[categoryId]/design">) {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Suspense fallback={<EditorSkeleton />}>
        <Design params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Design({ params, searchParams }: Pick<PageProps<"/admin/categories/[categoryId]/design">, "params" | "searchParams">) {
  await requireRole("admin");
  const [{ categoryId: raw }, { parent: parentParam }, top, token] = await Promise.all([params, searchParams, loadTopCategories(), getSessionToken()]);
  const crumbs = [{ name: "Categories", href: "/admin/categories" }];
  if (!top.ok) return <AdminLoadFailed message={top.error.message} />;

  const id = parseCategoryId(raw);
  const parent = top.data.find((c) => c.categoryId === parseCategoryId(parentParam)) ?? null;
  let category = parent ? undefined : top.data.find((c) => c.categoryId === id);
  if (parent && id !== null) {
    const subs = await loadSubcategories(parent.categoryId);
    if (!subs.ok) return <AdminLoadFailed message={subs.error.message} />;
    category = subs.data.find((c) => c.categoryId === id);
  }
  if (!category || !token) {
    return (
      <>
        <AdminPageHeader crumbs={crumbs} title="Design category page" />
        <div className="rounded-3xl border border-line bg-white px-5 py-6">
          <p className="font-semibold text-ink">This category can&apos;t be opened from this link.</p>
          <p className="mt-1 text-sm text-muted">Open it from the category tree. Hidden categories can&apos;t be opened here yet.</p>
          <Link href="/admin/categories" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/85">
            Back to categories
          </Link>
        </div>
      </>
    );
  }

  const [admin, live] = await Promise.all([pageApi.getAdminPage(token, category.categoryId), getCategoryPageById(category.categoryId)]);
  const title = `${category.name} page`;
  if (!admin.ok) {
    return (
      <>
        <AdminPageHeader crumbs={crumbs} title={title} />
        <AdminLoadFailed message={admin.error.message} />
      </>
    );
  }
  const shopHref = parent ? categoryPath(category, parent) : categoryPath(category);
  return (
    <>
      <AdminPageHeader crumbs={parent ? [...crumbs, { name: parent.name, href: `/admin/categories?open=${parent.categoryId}` }] : crumbs} title={title} subtitle="Design what shoppers see. Changes go live when you publish." />
      <PageEditor
        // A fresh editor for another category (state is kept while the admin works on this one).
        key={category.categoryId}
        category={{ categoryId: category.categoryId, name: category.name, slug: category.slug, description: category.description, imageUrl: category.imageUrl, badgeLabel: category.badgeLabel }}
        parent={parent ? { name: parent.name, slug: parent.slug } : null}
        initial={admin.data}
        live={live.ok ? live.data : null}
        shopHref={shopHref}
        customDesign={!parent && CUSTOM_CATEGORY_PAGES.has(category.slug)}
      />
    </>
  );
}

function EditorSkeleton() {
  return (
    <div aria-hidden className="space-y-5">
      <div className="h-16 animate-pulse rounded-3xl bg-line/60" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-[32rem] animate-pulse rounded-3xl bg-line/60" />
        <div className="h-80 animate-pulse rounded-3xl bg-line/60" />
      </div>
    </div>
  );
}
