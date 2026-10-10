import { CalendarDays, Leaf, Scale, Snowflake, Store, ThumbsUp } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqSection } from "@/components/FaqSection";
import { JsonLd } from "@/components/JsonLd";
import { ProductBrowser } from "@/components/ProductBrowser";
import { ProductRail } from "@/components/ProductRail";
import { SectionHeading } from "@/components/SectionHeading";
import { SubcategoryTile } from "@/components/SubcategoryTile";
import { getCatalogStats, getProducts, getSubcategories } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { itemListJsonLd } from "@/lib/seo";
import { FRUITS_BANNER, FRUITS_FAQS, FRUITS_GUIDE, FRUITS_INTRO, FRUITS_SEO } from "./content";

export const metadata: Metadata = {
  title: FRUITS_SEO.title,
  description: FRUITS_SEO.description,
  alternates: { canonical: "/fruits" },
  openGraph: {
    title: FRUITS_SEO.title,
    description: FRUITS_SEO.description,
    url: "/fruits",
    images: [FRUITS_BANNER.image],
  },
};

const TRUST_POINTS = [
  { icon: Store, text: "Sold by fruit shops near you" },
  { icon: Scale, text: "Compare prices across stores" },
  { icon: CalendarDays, text: "Seasonal and imported varieties" },
];

const GUIDE_ICONS = { season: CalendarDays, check: ThumbsUp, store: Snowflake };

export default async function FruitsPage() {
  const [subcategories, products, stats] = await Promise.all([
    getSubcategories("fruits"),
    getProducts("fruits"),
    getCatalogStats("fruits"),
  ]);
  const inSeason = products.filter((p) => p.inSeason && p.price !== null).slice(0, 8);
  const countFor = (slug: string) => products.filter((p) => p.subcategory === slug).length;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-5 sm:space-y-16 sm:py-6">
      <JsonLd data={itemListJsonLd("Fresh fruits", products)} />

      <div className="space-y-4">
        <Breadcrumbs items={[{ name: "Fruits", href: "/fruits" }]} />

        {/* Banner: text + photo. Photo first on phones. */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-50 via-white to-amber-50 ring-1 ring-line">
          <div className="grid items-center gap-6 p-4 sm:p-8 md:grid-cols-[1.05fr_1fr] md:gap-10 lg:p-12">
            <div className="order-2 md:order-1">
              {stats.inSeasonCount > 0 && (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-fresh ring-1 ring-green-200 motion-safe:animate-fade-up">
                  <Leaf aria-hidden className="size-3.5" />
                  {stats.inSeasonCount} fruits in season now
                </p>
              )}
              <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-ink motion-safe:animate-fade-up motion-safe:[animation-delay:80ms] sm:text-4xl lg:text-5xl">
                Fresh Fruits
                <span className="block text-fresh">from stores near you</span>
              </h1>
              <p className="mt-3 max-w-lg text-muted motion-safe:animate-fade-up motion-safe:[animation-delay:160ms] sm:text-lg">
                {FRUITS_INTRO}
              </p>

              <ul className="mt-5 space-y-2 motion-safe:animate-fade-up motion-safe:[animation-delay:240ms]">
                {TRUST_POINTS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5 text-sm font-medium text-ink">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-fresh ring-1 ring-green-200">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              <dl className="mt-6 grid max-w-md grid-cols-3 divide-x divide-line rounded-2xl bg-white/80 py-3 text-center ring-1 ring-line motion-safe:animate-fade-up motion-safe:[animation-delay:320ms]">
                {[
                  { label: "Products", value: stats.productCount },
                  { label: "Types", value: subcategories.length },
                  { label: "Stores", value: stats.storeCount },
                ].map((s) => (
                  <div key={s.label}>
                    <dt className="text-xs text-muted">{s.label}</dt>
                    <dd className="text-xl font-extrabold text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative order-1 md:order-2">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl shadow-xl shadow-green-900/10 md:aspect-[4/3]">
                <Image
                  src={FRUITS_BANNER.image}
                  alt={FRUITS_BANNER.alt}
                  fill
                  preload
                  sizes="(min-width: 768px) 520px, 100vw"
                  className="object-cover motion-safe:animate-ken-burns"
                />
              </div>
              {stats.lowestPrice !== null && (
                <p className="absolute -bottom-3 left-3 rounded-xl bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-line sm:left-5">
                  <span className="text-muted">Prices from </span>
                  <span className="font-extrabold text-ink">{formatPrice(stats.lowestPrice)}</span>
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="types-heading" className="reveal">
        <SectionHeading id="types-heading" title="Shop by type" subtitle="Pick a fruit to see every variety and price" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {subcategories.map((sub) => (
            <li key={sub.slug}>
              <SubcategoryTile subcategory={sub} productCount={countFor(sub.slug)} />
            </li>
          ))}
        </ul>
      </section>

      {inSeason.length > 0 && (
        <section aria-labelledby="season-heading" className="reveal">
          <SectionHeading id="season-heading" title="In season now" subtitle="At their freshest and best value right now" />
          <ProductRail products={inSeason} />
        </section>
      )}

      <section aria-labelledby="all-heading" className="reveal">
        <SectionHeading id="all-heading" title="All fruits" />
        <ProductBrowser products={products} types={subcategories.map((s) => ({ slug: s.slug, name: s.name }))} />
      </section>

      <section aria-labelledby="guide-heading" className="reveal rounded-3xl bg-surface p-5 sm:p-8">
        <SectionHeading id="guide-heading" title="How to choose fresh fruits" />
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {FRUITS_GUIDE.map((tip) => {
            const Icon = GUIDE_ICONS[tip.icon];
            return (
              <div key={tip.heading} className="rounded-2xl bg-white p-5 ring-1 ring-line">
                <span className="flex size-10 items-center justify-center rounded-xl bg-green-50 text-fresh">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-3 font-bold text-ink">{tip.heading}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{tip.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="reveal">
        <FaqSection title="Fruits: frequently asked questions" faqs={FRUITS_FAQS} />
      </div>
    </div>
  );
}
