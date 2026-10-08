import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqSection } from "@/components/FaqSection";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { SortableProductGrid } from "@/components/SortableProductGrid";
import { SubcategoryCard } from "@/components/SubcategoryCard";
import { getProducts, getSubcategories } from "@/lib/api";
import { itemListJsonLd } from "@/lib/seo";
import { FRUITS_FAQS, FRUITS_GUIDE, FRUITS_INTRO, FRUITS_SEO } from "./content";

export const metadata: Metadata = {
  title: FRUITS_SEO.title,
  description: FRUITS_SEO.description,
  alternates: { canonical: "/fruits" },
  openGraph: { title: FRUITS_SEO.title, description: FRUITS_SEO.description, url: "/fruits" },
};

export default async function FruitsPage() {
  const [subcategories, products] = await Promise.all([getSubcategories("fruits"), getProducts("fruits")]);
  const inSeason = products.filter((p) => p.inSeason && p.price !== null).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-6">
      <JsonLd data={itemListJsonLd("Fresh fruits", products)} />
      <Breadcrumbs items={[{ name: "Fruits", href: "/fruits" }]} />

      <header className="flex items-center justify-between gap-6 rounded-3xl bg-green-50 p-6 sm:p-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Fresh Fruits</h1>
          <p className="mt-2 max-w-xl text-muted">{FRUITS_INTRO}</p>
        </div>
        <span aria-hidden className="hidden text-7xl sm:block">
          🍎🥭🍌
        </span>
      </header>

      <section aria-labelledby="types-heading">
        <h2 id="types-heading" className="text-xl font-bold text-ink">
          Shop by type
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subcategories.map((sub) => (
            <li key={sub.slug}>
              <SubcategoryCard subcategory={sub} />
            </li>
          ))}
        </ul>
      </section>

      {inSeason.length > 0 && (
        <section aria-labelledby="season-heading">
          <h2 id="season-heading" className="text-xl font-bold text-ink">
            🌱 In season now
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {inSeason.map((product) => (
              <li key={product.slug} className="flex">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="all-heading">
        <h2 id="all-heading" className="mb-4 text-xl font-bold text-ink">
          All fruits
        </h2>
        <SortableProductGrid products={products} />
      </section>

      <section aria-labelledby="guide-heading" className="rounded-3xl bg-surface p-6 sm:p-8">
        <h2 id="guide-heading" className="text-xl font-bold text-ink">
          How to choose fresh fruits
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          {FRUITS_GUIDE.map((tip) => (
            <div key={tip.heading}>
              <h3 className="font-semibold text-ink">{tip.heading}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{tip.text}</p>
            </div>
          ))}
        </div>
      </section>

      <FaqSection title="Fruits: frequently asked questions" faqs={FRUITS_FAQS} />
    </div>
  );
}
