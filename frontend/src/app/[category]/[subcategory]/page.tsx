import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogUnavailable, ShopPageSkeleton } from "@/components/catalog/ShopStates";
import { SubcategoryView } from "@/components/catalog/SubcategoryView";
import { getShopSubcategory } from "@/lib/catalog/data";
import { subcategoryMetadata } from "@/lib/catalog/seo";

// The shared page for a subcategory (/<category>/<subcategory>), for categories
// without their own folder. Products will be listed here once they exist.

export async function generateMetadata({ params }: PageProps<"/[category]/[subcategory]">): Promise<Metadata> {
  const { category, subcategory } = await params;
  const loaded = await getShopSubcategory(category, subcategory);
  return subcategoryMetadata(loaded.ok ? loaded.data : null);
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
  const loaded = await getShopSubcategory(category, subcategory);
  if (!loaded.ok) return <CatalogUnavailable message={loaded.error.message} />;
  if (!loaded.data) notFound();
  return <SubcategoryView data={loaded.data} />;
}
