import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryPageView } from "@/components/category-page/CategoryPageView";
import { CatalogUnavailable, ShopPageSkeleton } from "@/components/catalog/ShopStates";
import { getCategoryPage } from "@/lib/catalog/data";
import { categoryPageMetadata } from "@/lib/catalog/seo";

// The shared page for every top-level category made in the admin panel, at
// /<slug>, designed in the admin's page editor (theme, hero, sections). A
// category with its own folder (app/fruits) gets that page instead: Next.js
// always prefers a fixed folder over this [category] one, and so do the site's
// own pages (/login, /account…), which is why those slugs are reserved.
//
// One cached backend call per page (GET /category-pages/{id}, the id found in
// the cached category list), shared by every visitor; metadata and the page
// reuse the same cached copy.

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const { category } = await params;
  const loaded = await getCategoryPage(category);
  return categoryPageMetadata(loaded.ok ? loaded.data : null);
}

export default function CategoryPage({ params }: PageProps<"/[category]">) {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

async function CategoryContent({ params }: Pick<PageProps<"/[category]">, "params">) {
  const { category } = await params;
  const loaded = await getCategoryPage(category);
  if (!loaded.ok) return <CatalogUnavailable message={loaded.error.message} />;
  if (!loaded.data) notFound();
  return <CategoryPageView data={loaded.data} />;
}
