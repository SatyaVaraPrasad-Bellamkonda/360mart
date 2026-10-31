import { PackageOpen } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { CategoryTile } from "@/components/catalog/CategoryTile";
import { ComingSoonProducts } from "@/components/catalog/ShopStates";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/SectionHeading";
import { pageTheme, themeStyle, type FoodTheme } from "@/lib/catalog/food-theme";
import { categoryListJsonLd, faqJsonLd } from "@/lib/catalog/seo";
import type { Category } from "@/lib/catalog/types";
import { categoryPath } from "@/lib/catalog/validation";
import { heroDisplay, revealOf, type CategoryPage, type PageSection, type RevealAnimation } from "@/lib/category-page/types";
import { FaqBlock, PromoBanner, TextBlock, TrustStrip } from "./ContentBlocks";
import { PageHero, type HeroStat } from "./PageHero";
import { ProductRow } from "./ProductRow";
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
  // Subcategory pages keep the compact banner, so their products come into view sooner.
  const display = { ...heroDisplay(page.hero), ...(isSub ? { size: "COMPACT" as const } : {}) };
  const faq = sections.find((s) => s.type === "FAQ");

  return (
    <div style={themeStyle(data.customColour)} className={`mx-auto max-w-6xl space-y-10 px-4 py-5 sm:space-y-14 sm:py-6 ${preview ? "[&_a]:pointer-events-none" : ""}`}>
      {!preview &&
        (isSub
          ? products.length > 0 && <JsonLd data={categoryListJsonLd(category.name, products.map((p) => ({ name: p.name, path: `${path}/${p.slug}` })))} />
          : subcategories.length > 0 && <JsonLd data={categoryListJsonLd(category.name, subcategories.map((s) => ({ name: s.name, path: categoryPath(s, category) })))} />)}
      {!preview && faq?.type === "FAQ" && <JsonLd data={faqJsonLd(faq.items)} />}

      <div className="space-y-4">
        <Breadcrumbs items={isSub ? [{ name: parent.name, href: categoryPath(parent) }, { name: category.name, href: path }] : [{ name: category.name, href: path }]} />
        <PageHero hero={page.hero} display={display} theme={theme} stats={stats} parent={isSub ? { name: parent.name, href: categoryPath(parent) } : null} />
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
  if (s.type === "PROMO_BANNER") return !!s.headline?.trim();
  if (s.type === "TEXT_BLOCK") return !!s.body?.trim();
  if (s.type === "TRUST_STRIP") return (s.points?.length ?? 0) > 0;
  if (s.type === "FAQ") return (s.items?.length ?? 0) > 0;
  return false; // a type this site doesn't know yet
}

// Scroll-in effect the admin chose; CSS only (globals.css), off with reduced motion or in older browsers.
const REVEAL: Record<RevealAnimation, string> = { NONE: "", FADE: "reveal-fade", RISE: "reveal" };

function Section({ section: s, data, theme, path, preview }: { section: PageSection; data: CategoryPage; theme: FoodTheme; path: string; preview?: boolean }) {
  const { category } = data;
  const id = `section-${s.id}`;
  const reveal = REVEAL[revealOf(s)];
  if (s.type === "PROMO_BANNER")
    return (
      <section aria-labelledby={id} className={reveal}>
        <PromoBanner section={s} image={data.sectionImages?.[s.id] ?? null} id={id} />
      </section>
    );
  if (s.type === "TEXT_BLOCK")
    return (
      <section aria-labelledby={id} className={reveal}>
        <TextBlock section={s} theme={theme} id={id} />
      </section>
    );
  if (s.type === "TRUST_STRIP")
    return (
      <section aria-labelledby={id} className={reveal}>
        <TrustStrip section={s} theme={theme} id={id} />
      </section>
    );
  if (s.type === "FAQ")
    return (
      <section aria-labelledby={id} className={reveal}>
        <FaqBlock section={s} theme={theme} id={id} />
      </section>
    );
  if (s.type === "SUBCATEGORIES") {
    const title = s.title || "Shop by type";
    const subtitle = s.subtitle || "Pick a type to see what local stores offer";
    return (
      <section aria-labelledby={id} className={reveal}>
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
      <section aria-labelledby={id} className={reveal}>
        <SectionHeading id={id} title={title} subtitle={s.subtitle || undefined} />
        <ProductRow items={items} />
      </section>
    );
  }
  if (s.type === "PRODUCT_GRID" && data.parent) {
    const first = data.products ?? { items: [], page: 0, size: 24, totalItems: 0, totalPages: 0 };
    return (
      <section aria-labelledby={id} className={reveal}>
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
