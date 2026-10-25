import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryPageView } from "@/components/category-page/CategoryPageView";
import { CatalogUnavailable, ShopPageSkeleton } from "@/components/catalog/ShopStates";
import { getCategoryPage } from "@/lib/catalog/data";
import { categoryPageMetadata } from "@/lib/catalog/seo";

// The shared page for a subcategory (/<category>/<subcategory>), for categories
// without their own folder: hero, sibling chips and the product grid (first 24
// in the page call, "Show more" for the rest). One cached call per page.

export async function generateMetadata({ params }: PageProps<"/[category]/[subcategory]">): Promise<Metadata> {
  const { category, subcategory } = await params;
  const loaded = await getCategoryPage(category, subcategory);
  return categoryPageMetadata(loaded.ok ? loaded.data : null);
}

export default function SubcategoryPage({ params }: PageProps<"/[category]/[subcategory]">) {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <SubcategoryContent params={params} />
    </Suspense>
  );
}

async function SubcategoryContent({ params }: Pick<PageProps<"/[category]/[subcategory]">, "params">) {
  const { category, subcategory } = await params;
  const loaded = await getCategoryPage(category, subcategory);
  if (!loaded.ok) return <CatalogUnavailable message={loaded.error.message} />;
  if (!loaded.data) notFound();
  return <CategoryPageView data={loaded.data} />;
}
