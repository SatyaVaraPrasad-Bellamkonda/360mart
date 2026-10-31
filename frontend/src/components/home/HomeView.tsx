import { ArrowRight, Search, Store } from "lucide-react";
import Link from "next/link";
import { CategoryCard } from "@/components/CategoryCard";
import { CategoryImage } from "@/components/catalog/CategoryImage";
import { FaqBlock, PromoBanner, TextBlock, TrustStrip } from "@/components/category-page/ContentBlocks";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/SectionHeading";
import { categoryListJsonLd, faqJsonLd } from "@/lib/catalog/seo";
import type { Category } from "@/lib/catalog/types";
import { categoryHref } from "@/lib/catalog/validation";
import { revealOf, type ProductCard, type RevealAnimation } from "@/lib/category-page/types";
import { isSlotSource, type CategoryGridSection, type HomePage, type HomeSection } from "@/lib/home-page/types";
import { railSourceInfo, slotAt } from "@/lib/home-page/validation";
import { searchHref } from "@/lib/search/query";
import { BuyAgainRow } from "./BuyAgainRow";
import { HomeHero } from "./HomeHero";
import { HomeProductRow } from "./HomeProductRow";
import { HOME_THEME } from "./theme";
import { TimeSlotRow } from "./TimeSlotRow";

const REVEAL: Record<RevealAnimation, string> = { NONE: "", FADE: "reveal-fade", RISE: "reveal" };

/**
 * The home page from the one API response: hero, "Buy again" for signed-in
 * shoppers, then the admin's sections in order. `minute` = the India minute of
 * the day when rendering (picks the time-of-day row; the browser checks again).
 * `parents` = the top-level categories, for links to picked subcategories.
 * Used by the shop and the admin's full preview (preview: no JSON-LD, no links,
 * no per-shopper row).
 */
export function HomeView({ data, minute, parents, preview }: { data: HomePage; minute: number; parents: Category[]; preview?: boolean }) {
  const sections = data.sections.filter((s) => s.enabled !== false && hasContent(s, data));
  const firstGrid = sections.find((s) => s.type === "CATEGORY_GRID")?.id;
  const faq = sections.find((s) => s.type === "FAQ");
  return (
    <div className={preview ? "[&_a]:pointer-events-none" : ""}>
      {!preview && <PageJsonLd data={data} sections={sections} minute={minute} parents={parents} />}
      {!preview && faq?.type === "FAQ" && <JsonLd data={faqJsonLd(faq.items)} />}
      <HomeHero hero={data.hero} />
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:space-y-16 sm:py-14">
        {!preview && <BuyAgainRow />}
        {sections.map((s) => (
          <Section key={s.id} section={s} data={data} minute={minute} parents={parents} anchor={s.id === firstGrid} />
        ))}
        {sections.length === 0 && (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center">
            <Store aria-hidden className="size-8 text-brand-deep" />
            <p className="mt-3 font-bold text-ink">Stores are getting ready</p>
            <p className="mt-1 max-w-sm text-sm text-muted">Local shops are adding their products. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Whether a section has anything to show (empty rows and grids are hidden: a new catalogue, not enough sales yet). */
function hasContent(s: HomeSection, data: HomePage): boolean {
  switch (s.type) {
    case "CATEGORY_GRID":
      return (data.categoryGrids[s.id]?.length ?? 0) > 0;
    case "PRODUCT_RAIL":
      // Time-of-day rows: kept when any slot has products (the browser may show another slot than the server).
      return isSlotSource(s.source) ? Object.values(data.slotRails[s.id] ?? {}).some((r) => r.products.length > 0) : (data.rails[s.id]?.length ?? 0) > 0;
    case "TRENDING_SEARCHES":
      return (data.trendingSearches[s.id]?.length ?? 0) > 0;
    case "PROMO_BANNER":
      return !!s.headline?.trim();
    case "TEXT_BLOCK":
      return !!s.body?.trim();
    case "TRUST_STRIP":
      return (s.points?.length ?? 0) > 0;
    case "FAQ":
      return (s.items?.length ?? 0) > 0;
    default:
      return false; // a type this site doesn't know yet
  }
}

function Section({ section: s, data, minute, parents, anchor }: { section: HomeSection; data: HomePage; minute: number; parents: Category[]; anchor: boolean }) {
  const id = `section-${s.id}`;
  const reveal = REVEAL[revealOf(s)];
  switch (s.type) {
    case "CATEGORY_GRID":
      return <CategoryGrid section={s} categories={data.categoryGrids[s.id] ?? []} parents={parents} anchor={anchor} reveal={reveal} />;
    case "PRODUCT_RAIL": {
      if (isSlotSource(s.source)) return <TimeSlotRow id={s.id} slots={data.timeSlots} rails={data.slotRails[s.id] ?? {}} serverMinute={minute} className={reveal} />;
      const title = s.title || railSourceInfo(s.source).title || "Products";
      return (
        <section aria-labelledby={id} className={reveal}>
          <SectionHeading id={id} title={title} subtitle={s.subtitle || undefined} />
          <HomeProductRow items={data.rails[s.id] ?? []} label={title} />
        </section>
      );
    }
    case "TRENDING_SEARCHES": {
      const terms = data.trendingSearches[s.id] ?? [];
      return (
        <section aria-labelledby={id} className={reveal}>
          <SectionHeading id={id} title={s.title || "Trending searches"} subtitle={s.subtitle || "What shoppers near you are looking for"} />
          <ul className="flex flex-wrap gap-2">
            {terms.map((term) => (
              <li key={term}>
                <Link
                  href={searchHref(term)}
                  className="flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold capitalize text-ink ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-ink/30"
                >
                  <Search aria-hidden className="size-3.5 text-brand-deep" />
                  {term}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "PROMO_BANNER":
      return (
        <section aria-labelledby={id} className={reveal}>
          <PromoBanner section={s} image={data.sectionImages[s.id] ?? null} id={id} />
        </section>
      );
    case "TEXT_BLOCK":
      return (
        <section aria-labelledby={id} className={reveal}>
          <TextBlock section={s} theme={HOME_THEME} id={id} />
        </section>
      );
    case "TRUST_STRIP":
      return (
        <section aria-labelledby={id} className={reveal}>
          <TrustStrip section={s} theme={HOME_THEME} id={id} />
        </section>
      );
    case "FAQ":
      return (
        <section aria-labelledby={id} className={reveal}>
          <FaqBlock section={s} theme={HOME_THEME} id={id} />
        </section>
      );
    default:
      return null;
  }
}

const linkOf = categoryHref;

function CategoryGrid({ section: s, categories, parents, anchor, reveal }: { section: CategoryGridSection; categories: Category[]; parents: Category[]; anchor: boolean; reveal: string }) {
  const id = `section-${s.id}`;
  const title = s.title || "Shop by category";
  return (
    // The first grid is where "Start shopping" (/#categories) lands.
    <section id={anchor ? "categories" : undefined} aria-labelledby={id} className={`scroll-mt-32 md:scroll-mt-24 ${reveal}`}>
      <SectionHeading
        id={id}
        title={title}
        subtitle={s.subtitle || undefined}
        action={
          s.mode !== "PICKED" && (
            <Link href="/categories" className="-my-2 flex min-h-10 shrink-0 items-center gap-1 text-sm font-semibold text-brand-deep hover:underline">
              All <span className="sr-only">categories</span>
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          )
        }
      />
      {s.layout === "CHIPS" ? (
        <ul className="flex flex-wrap gap-2 sm:gap-3">
          {categories.map((c) => (
            <li key={c.categoryId}>
              <Link
                href={linkOf(c, parents)}
                className="flex min-h-12 items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-ink/30"
              >
                <span className="size-9 shrink-0 overflow-hidden rounded-full bg-brand-soft">
                  <CategoryImage src={c.imageUrl} alt="" className="size-full" iconClassName="size-5" />
                </span>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((c, i) => (
            <li key={c.categoryId}>
              <CategoryCard category={c} href={linkOf(c, parents)} priority={anchor && i < 2} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** ItemList data for the category grids and the product rows (the row showing now for time of day). */
function PageJsonLd({ data, sections, minute, parents }: { data: HomePage; sections: HomeSection[]; minute: number; parents: Category[] }) {
  const lists: { name: string; items: { name: string; path: string }[] }[] = [];
  const productItems = (cards: ProductCard[]) => cards.map((p) => ({ name: p.name, path: `/${p.categorySlug}/${p.subcategorySlug}/${p.slug}` }));
  for (const s of sections) {
    if (s.type === "CATEGORY_GRID") lists.push({ name: s.title || "Shop by category", items: (data.categoryGrids[s.id] ?? []).map((c) => ({ name: c.name, path: linkOf(c, parents) })) });
    if (s.type === "PRODUCT_RAIL" && !isSlotSource(s.source)) lists.push({ name: s.title || railSourceInfo(s.source).title, items: productItems(data.rails[s.id] ?? []) });
    if (s.type === "PRODUCT_RAIL" && isSlotSource(s.source)) {
      const slot = slotAt(data.timeSlots, minute);
      const row = slot ? data.slotRails[s.id]?.[slot.id] : undefined;
      if (row) lists.push({ name: row.title, items: productItems(row.products) });
    }
  }
  return (
    <>
      {lists
        .filter((l) => l.items.length > 0)
        .map((l, i) => (
          <JsonLd key={i} data={categoryListJsonLd(l.name, l.items)} />
        ))}
    </>
  );
}
