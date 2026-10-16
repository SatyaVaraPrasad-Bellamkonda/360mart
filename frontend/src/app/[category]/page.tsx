import { Layers, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { CategoryTile } from "@/components/catalog/CategoryTile";
import { CatalogUnavailable, ComingSoonProducts, ShopPageSkeleton } from "@/components/catalog/ShopStates";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/SectionHeading";
import { getShopCategory } from "@/lib/catalog/data";
import { CATEGORY_PAGES_INDEXABLE, categoryDescription, categoryListJsonLd, categoryTitle } from "@/lib/catalog/seo";
import { categoryPath, isSlug } from "@/lib/catalog/validation";

// The shared page for every top-level category made in the admin panel, at
// /<slug>. A category with its own folder (app/fruits) gets that page instead:
// Next.js always prefers a fixed folder over this [category] one, and so do the
// site's own pages (/login, /account…), which is why those slugs are reserved.

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const loaded = isSlug(slug) ? await getShopCategory(slug) : null;
  if (!loaded?.ok || !loaded.data) return { robots: { index: false, follow: true } };

  const { category } = loaded.data;
  const title = categoryTitle(category);
  const description = categoryDescription(category);
  const url = categoryPath(category);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    robots: { index: CATEGORY_PAGES_INDEXABLE, follow: true },
  };
}

export default function CategoryPage({ params }: PageProps<"/[category]">) {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

async function CategoryContent({ params }: Pick<PageProps<"/[category]">, "params">) {
  const { category: slug } = await params;
  if (!isSlug(slug)) notFound();
  const loaded = await getShopCategory(slug);
  if (!loaded.ok) return <CatalogUnavailable message={loaded.error.message} />;
  if (!loaded.data) notFound();

  const { category, subcategories } = loaded.data;
  const path = categoryPath(category);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-5 sm:space-y-14 sm:py-6">
      <JsonLd data={categoryListJsonLd(category.name, subcategories.map((s) => ({ name: s.name, path: categoryPath(s, category) })))} />

      <div className="space-y-4">
        <Breadcrumbs items={[{ name: category.name, href: path }]} />

        {/* Banner: picture on top for phones, beside the text on larger screens */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-soft/70 via-white to-green-50 ring-1 ring-line md:grid md:grid-cols-[1.1fr_1fr]">
          <div className="relative aspect-[16/9] overflow-hidden md:order-2 md:aspect-auto md:min-h-80">
            <CategoryImage src={category.imageUrl} alt={category.name} priority className="absolute inset-0 size-full motion-safe:animate-ken-burns" iconClassName="size-16" />
          </div>
          <div className="flex flex-col justify-center p-5 sm:p-8 md:order-1 lg:p-10">
            {category.badgeLabel && (
              <p className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-deep ring-1 ring-brand/30 motion-safe:animate-fade-up">{category.badgeLabel}</p>
            )}
            <h1 className="mt-3 break-words text-3xl font-extrabold leading-tight tracking-tight text-ink motion-safe:animate-fade-up motion-safe:[animation-delay:80ms] sm:text-4xl lg:text-5xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-3 max-w-lg whitespace-pre-line break-words text-muted motion-safe:animate-fade-up motion-safe:[animation-delay:160ms] sm:text-lg">
                {category.description}
              </p>
            )}
            {subcategories.length > 0 && (
              <p className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line motion-safe:animate-fade-up motion-safe:[animation-delay:240ms]">
                <Layers aria-hidden className="size-4 text-fresh" />
                {subcategories.length} {subcategories.length === 1 ? "type" : "types"} to explore
              </p>
            )}
          </div>
        </section>
      </div>

      {subcategories.length > 0 ? (
        <section aria-labelledby="types-heading" className="reveal">
          <SectionHeading id="types-heading" title="Shop by type" subtitle={`Pick a type to see what local stores offer`} />
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {subcategories.map((sub) => (
              <li key={sub.categoryId}>
                <CategoryTile category={sub} href={categoryPath(sub, category)} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ComingSoonProducts icon={PackageOpen} title={`${category.name} is coming soon`} text="Local stores are getting ready. Check back soon to start shopping." />
      )}
    </div>
  );
}
