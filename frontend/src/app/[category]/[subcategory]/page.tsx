import { PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { CatalogUnavailable, ComingSoonProducts, ShopPageSkeleton } from "@/components/catalog/ShopStates";
import { getShopCategory } from "@/lib/catalog/data";
import { CATEGORY_PAGES_INDEXABLE, categoryDescription, categoryTitle } from "@/lib/catalog/seo";
import { categoryPath, isSlug } from "@/lib/catalog/validation";

// The shared page for a subcategory (/<category>/<subcategory>), for categories
// without their own folder. Products will be listed here once they exist.

async function load(params: PageProps<"/[category]/[subcategory]">["params"]) {
  const { category: parentSlug, subcategory: slug } = await params;
  if (!isSlug(parentSlug) || !isSlug(slug)) return null;
  const loaded = await getShopCategory(parentSlug);
  if (!loaded.ok) return loaded;
  const subcategory = loaded.data?.subcategories.find((s) => s.slug === slug);
  return { ok: true as const, data: loaded.data && subcategory ? { ...loaded.data, subcategory } : null };
}

export async function generateMetadata({ params }: PageProps<"/[category]/[subcategory]">): Promise<Metadata> {
  const loaded = await load(params);
  if (!loaded?.ok || !loaded.data) return { robots: { index: false, follow: true } };

  const { category, subcategory } = loaded.data;
  const title = categoryTitle(subcategory, category.name);
  const description = categoryDescription(subcategory, category.name);
  const url = categoryPath(subcategory, category);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    robots: { index: CATEGORY_PAGES_INDEXABLE, follow: true },
  };
}

export default function SubcategoryPage({ params }: PageProps<"/[category]/[subcategory]">) {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <SubcategoryContent params={params} />
    </Suspense>
  );
}

async function SubcategoryContent({ params }: Pick<PageProps<"/[category]/[subcategory]">, "params">) {
  const loaded = await load(params);
  if (!loaded) notFound();
  if (!loaded.ok) return <CatalogUnavailable message={loaded.error.message} />;
  if (!loaded.data) notFound();

  const { category, subcategories, subcategory } = loaded.data;
  const parentPath = categoryPath(category);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-5 sm:space-y-10 sm:py-6">
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { name: category.name, href: parentPath },
            { name: subcategory.name, href: categoryPath(subcategory, category) },
          ]}
        />

        <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-line md:grid md:grid-cols-[1fr_1.1fr]">
          <div className="relative aspect-[16/9] overflow-hidden md:order-2 md:aspect-auto md:min-h-72">
            <CategoryImage src={subcategory.imageUrl} alt={subcategory.name} priority className="absolute inset-0 size-full motion-safe:animate-ken-burns" iconClassName="size-16" />
          </div>
          <div className="flex flex-col justify-center p-5 sm:p-8 md:order-1 lg:p-10">
            <Link href={parentPath} className="-my-3 inline-block w-fit py-3 text-xs font-semibold uppercase tracking-wider text-fresh hover:underline">
              {category.name}
            </Link>
            <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-ink motion-safe:animate-fade-up sm:text-4xl">{subcategory.name}</h1>
            {subcategory.badgeLabel && (
              <p className="mt-3 w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-deep">{subcategory.badgeLabel}</p>
            )}
            {subcategory.description && (
              <p className="mt-3 whitespace-pre-line break-words text-muted motion-safe:animate-fade-up motion-safe:[animation-delay:100ms]">{subcategory.description}</p>
            )}
          </div>
        </section>
      </div>

      {/* Switch between the types of this category */}
      {subcategories.length > 1 && (
        <nav aria-label={`${category.name} types`}>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {subcategories.map((s) => (
              <li key={s.categoryId} className="shrink-0">
                <Link
                  href={categoryPath(s, category)}
                  aria-current={s.categoryId === subcategory.categoryId ? "page" : undefined}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-4 text-sm font-semibold text-ink transition hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
                >
                  <CategoryImage src={s.imageUrl} alt="" className="size-8 shrink-0 rounded-full" iconClassName="size-4" />
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <ComingSoonProducts icon={PackageOpen} title={`${subcategory.name} from local stores, coming soon`} text="Stores near you are adding their products. Check back soon to start shopping." />
    </div>
  );
}
