import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryBadge } from "@/components/catalog/CategoryBadge";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { CatalogUnavailable } from "@/components/catalog/ShopStates";
import { JsonLd } from "@/components/JsonLd";
import { categoryPicture } from "@/lib/categories";
import { getShopTree } from "@/lib/catalog/data";
import { CATEGORY_PAGES_INDEXABLE, categoryListJsonLd } from "@/lib/catalog/seo";
import { categoryPath } from "@/lib/catalog/validation";
import { SITE } from "@/lib/site";

// Every category and its subcategories on one page: the header shows only the
// featured ones, so this is where everything else is found ("categories" is a
// reserved slug, so no category can take this URL).

export const metadata: Metadata = {
  title: "All categories",
  description: `Browse every category on ${SITE.name}: fresh food, groceries, fashion and more from local stores near you.`,
  alternates: { canonical: "/categories" },
  robots: { index: CATEGORY_PAGES_INDEXABLE, follow: true },
};

export default function AllCategoriesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:py-6">
      <Breadcrumbs items={[{ name: "All categories", href: "/categories" }]} />
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">All categories</h1>
        <p className="mt-1 text-muted">Everything you can shop from stores near you.</p>
      </div>
      <Suspense fallback={<TreeSkeleton />}>
        <Everything />
      </Suspense>
    </div>
  );
}

async function Everything() {
  const loaded = await getShopTree();
  if (!loaded.ok) return <CatalogUnavailable message={loaded.error.message} />;
  if (!loaded.data.length) return <p className="rounded-2xl bg-surface px-5 py-8 text-center text-muted ring-1 ring-line">Categories are on their way. Check back soon.</p>;

  return (
    <>
      <JsonLd data={categoryListJsonLd("All categories", loaded.data.map(({ category }) => ({ name: category.name, path: categoryPath(category) })))} />
      <ul className="grid gap-4 md:grid-cols-2">
        {loaded.data.map(({ category, children }) => (
          <li key={category.categoryId} className="overflow-hidden rounded-3xl bg-white ring-1 ring-line">
            <Link href={categoryPath(category)} className="group flex items-center gap-4 p-4 transition hover:bg-surface/70">
              <CategoryImage src={categoryPicture(category)} alt="" className="size-16 shrink-0 rounded-2xl ring-1 ring-line sm:size-20" iconClassName="size-8" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-lg font-extrabold text-ink">{category.name}</h2>
                  {category.badgeLabel && <CategoryBadge label={category.badgeLabel} />}
                </div>
                {category.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{category.description}</p>}
              </div>
              <ArrowRight aria-hidden className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
            {children.length > 0 && (
              <ul aria-label={`${category.name} types`} className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                {children.map((child) => (
                  <li key={child.categoryId}>
                    <Link href={categoryPath(child, category)} className="flex min-h-10 items-center gap-1.5 rounded-full bg-surface px-3 text-sm font-semibold text-ink ring-1 ring-line hover:ring-ink">
                      {child.name}
                      {child.badgeLabel && <CategoryBadge label={child.badgeLabel} className="max-w-24" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function TreeSkeleton() {
  return (
    <div aria-hidden className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-36 animate-pulse rounded-3xl bg-line/60" />
      ))}
    </div>
  );
}
