import { PackageOpen } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { CategoryTile } from "@/components/catalog/CategoryTile";
import { ShopProductCard } from "@/components/catalog/ShopProductCard";
import { ComingSoonProducts } from "@/components/catalog/ShopStates";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/SectionHeading";
import { pageTheme, themeStyle, type FoodTheme } from "@/lib/catalog/food-theme";
import { categoryListJsonLd } from "@/lib/catalog/seo";
import type { Category } from "@/lib/catalog/types";
import { categoryPath } from "@/lib/catalog/validation";
import type { CategoryPage, PageSection, ProductCard } from "@/lib/category-page/types";
import { PageHero, type HeroStat } from "./PageHero";
import { ProductGridBlock } from "./ProductGridBlock";

// A whole category page from the one API response: hero, then the admin's
// sections in their order. Used by the shop (top-level and subcategory pages)
// and by the admin's full preview (preview: no JSON-LD, links switched off).
export function CategoryPageView({ data, preview }: { data: CategoryPage; preview?: boolean }) {
  const { category, parent, page, subcategories, summary } = data;
  const theme = pageTheme(data.theme, data.customColour);
  const isSub = parent !== null;
  const path = isSub ? categoryPath(category, parent) : categoryPath(category);
  const stats = heroStats(data);
  const sections = page.sections.filter((s) => s.enabled !== false && rendersSomething(s, data));
  const products = data.products?.items ?? [];

  return (
    <div style={themeStyle(data.customColour)} className={`mx-auto max-w-6xl space-y-10 px-4 py-5 sm:space-y-14 sm:py-6 ${preview ? "[&_a]:pointer-events-none" : ""}`}>
      {!preview &&
        (isSub
          ? products.length > 0 && <JsonLd data={categoryListJsonLd(category.name, products.map((p) => ({ name: p.name, path: `${path}/${p.slug}` })))} />
          : subcategories.length > 0 && <JsonLd data={categoryListJsonLd(category.name, subcategories.map((s) => ({ name: s.name, path: categoryPath(s, category) })))} />)}

      <div className="space-y-4">
        <Breadcrumbs items={isSub ? [{ name: parent.name, href: categoryPath(parent) }, { name: category.name, href: path }] : [{ name: category.name, href: path }]} />
        <PageHero hero={page.hero} theme={theme} stats={stats} parent={isSub ? { name: parent.name, href: categoryPath(parent) } : null} compact={isSub} />
        {isSub && subcategories.length > 1 && <SiblingChips parent={parent} siblings={subcategories} current={category.categoryId} theme={theme} />}
      </div>

      {sections.map((s) => (
        <Section key={s.id} section={s} data={data} theme={theme} path={path} preview={preview} />
      ))}

      {sections.length === 0 && (
        <ComingSoonProducts
          icon={PackageOpen}
          title={`${category.name} is coming soon`}
          text={summary.productCount === 0 ? "Local stores are getting ready. Check back soon to start shopping." : "Browse the other categories while this page is being set up."}
        />
      )}
    </div>
  );
}

/** The counts the admin chose, from the summary. Location-based ones aren't in the response yet, so they're skipped, and so are zeros. */
function heroStats({ page, summary, parent }: CategoryPage): HeroStat[] {
  const out: HeroStat[] = [];
  for (const stat of page.hero.stats) {
    if (stat === "PRODUCTS" && summary.productCount > 0) out.push({ label: "Products", value: summary.productCount });
    if (stat === "TYPES" && !parent && summary.subcategoryCount > 0) out.push({ label: "Types", value: summary.subcategoryCount });
    if (stat === "IN_SEASON" && summary.inSeasonCount > 0) out.push({ label: "In season", value: summary.inSeasonCount });
  }
  return out;
}

function rendersSomething(s: PageSection, data: CategoryPage): boolean {
  if (s.type === "SUBCATEGORIES") return !data.parent && data.subcategories.length > 0;
  if (s.type === "PRODUCT_RAIL") return (data.rails[s.id]?.length ?? 0) > 0;
  if (s.type === "PRODUCT_GRID") return !!data.parent;
  return false; // a type this site doesn't know yet
}

function Section({ section: s, data, theme, path, preview }: { section: PageSection; data: CategoryPage; theme: FoodTheme; path: string; preview?: boolean }) {
  const { category } = data;
  const id = `section-${s.id}`;
  if (s.type === "SUBCATEGORIES") {
    const title = s.title || "Shop by type";
    const subtitle = s.subtitle || "Pick a type to see what local stores offer";
    return (
      <section aria-labelledby={id} className="reveal">
        <SectionHeading id={id} title={title} subtitle={subtitle} />
        {s.layout === "CHIPS" ? (
          <ul className="flex flex-wrap gap-2 sm:gap-3">
            {data.subcategories.map((sub) => (
              <li key={sub.categoryId}>
                <Link
                  href={categoryPath(sub, category)}
                  className="group flex min-h-12 items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-ink/30"
                >
                  <span className={`size-9 shrink-0 overflow-hidden rounded-full ${theme.placeholder}`}>
                    <CategoryImage src={sub.imageUrl} alt="" className="size-full" iconClassName="size-5" />
                  </span>
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {data.subcategories.map((sub) => (
              <li key={sub.categoryId}>
                <CategoryTile category={sub} href={categoryPath(sub, category)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
  if (s.type === "PRODUCT_RAIL") {
    const items = data.rails[s.id] ?? [];
    const title = s.title || (s.source === "IN_SEASON" ? "In season now" : "Featured picks");
    return (
      <section aria-labelledby={id} className="reveal">
        <SectionHeading id={id} title={title} subtitle={s.subtitle || undefined} />
        <ProductRow items={items} />
      </section>
    );
  }
  if (s.type === "PRODUCT_GRID" && data.parent) {
    const first = data.products ?? { items: [], page: 0, size: 24, totalItems: 0, totalPages: 0 };
    return (
      <section aria-labelledby={id}>
        <h2 id={id} className="sr-only">
          {s.title || `All ${category.name}`}
        </h2>
        {s.title && <SectionHeading id={`${id}-title`} title={s.title} subtitle={s.subtitle || undefined} />}
        {first.totalItems > 0 ? (
          <ProductGridBlock subcategoryId={category.categoryId} first={first} basePath={path} showFilters={s.showFilters !== false} preview={preview} />
        ) : (
          <ComingSoonProducts icon={PackageOpen} title={`${category.name} is coming soon`} text="Local stores are adding these products. Check back soon." />
        )}
      </section>
    );
  }
  return null;
}

// A swipeable row on phones, four across on large screens.
function ProductRow({ items }: { items: ProductCard[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
      {items.map((p) => (
        <li key={p.productId} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
          <ShopProductCard product={p} href={`/${p.categorySlug}/${p.subcategorySlug}/${p.slug}`} />
        </li>
      ))}
    </ul>
  );
}

// Jump between subcategories of the same category; the current one is marked.
function SiblingChips({ parent, siblings, current, theme }: { parent: Category; siblings: Category[]; current: number; theme: FoodTheme }) {
  return (
    <nav aria-label={`More in ${parent.name}`}>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {siblings.map((s) => {
          const on = s.categoryId === current;
          return (
            <li key={s.categoryId} className="shrink-0">
              <Link
                href={categoryPath(s, parent)}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${on ? `text-white ${theme.chipOn}` : "border-line bg-white text-ink hover:border-ink"}`}
              >
                {s.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
