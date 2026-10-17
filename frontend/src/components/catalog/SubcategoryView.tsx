import { Leaf, Package, PackageOpen } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import type { ShopSubcategory } from "@/lib/catalog/data";
import { categoryListJsonLd } from "@/lib/catalog/seo";
import { categoryPath } from "@/lib/catalog/validation";
import { CategoryBadge } from "./CategoryBadge";
import { CategoryImage } from "./CategoryImage";
import { ProductGrid } from "./ProductGrid";
import { ComingSoonProducts } from "./ShopStates";

// The shared subcategory page body: used by app/[category]/[subcategory], and by
// a designed category (app/fruits) for subcategories its design doesn't cover yet.
export function SubcategoryView({ data }: { data: ShopSubcategory }) {
  const { category, subcategories, subcategory, products } = data;
  const parentPath = categoryPath(category);
  const path = categoryPath(subcategory, category);
  const inSeason = products.filter((p) => p.isInSeason).length;
  const facts = [
    products.length > 0 && { icon: Package, text: `${products.length} ${products.length === 1 ? "product" : "products"}` },
    inSeason > 0 && { icon: Leaf, text: `${inSeason} in season` },
  ].filter((f) => !!f);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-5 sm:space-y-10 sm:py-6">
      {products.length > 0 && <JsonLd data={categoryListJsonLd(subcategory.name, products.map((p) => ({ name: p.name, path: `${path}/${p.slug}` })))} />}
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { name: category.name, href: parentPath },
            { name: subcategory.name, href: path },
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
            {subcategory.badgeLabel && <CategoryBadge label={subcategory.badgeLabel} className="mt-3 w-fit" />}
            {subcategory.description && (
              <p className="mt-3 whitespace-pre-line break-words text-muted motion-safe:animate-fade-up motion-safe:[animation-delay:100ms]">{subcategory.description}</p>
            )}
            {facts.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2 motion-safe:animate-fade-up motion-safe:[animation-delay:200ms]">
                {facts.map(({ icon: Icon, text }) => (
                  <li key={text} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line">
                    <Icon aria-hidden className="size-4 text-fresh" />
                    {text}
                  </li>
                ))}
              </ul>
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
                  {s.badgeLabel && <CategoryBadge label={s.badgeLabel} className="max-w-20" />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {products.length > 0 ? (
        <section aria-label={`${subcategory.name} products`}>
          <ProductGrid products={products} basePath={path} />
        </section>
      ) : (
        <ComingSoonProducts icon={PackageOpen} title={`${subcategory.name} from local stores, coming soon`} text="Stores near you are adding their products. Check back soon to start shopping." />
      )}
    </div>
  );
}
