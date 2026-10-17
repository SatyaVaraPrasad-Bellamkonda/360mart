import { ArrowRight, Bike, Leaf, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryCard, CategoryCardSkeleton } from "@/components/CategoryCard";
import { HeroVisual } from "@/components/HeroVisual";
import { JsonLd } from "@/components/JsonLd";
import { getShopCategoriesNow } from "@/lib/catalog/data";
import { categoryListJsonLd } from "@/lib/catalog/seo";
import { categoryPath } from "@/lib/catalog/validation";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HIGHLIGHTS = [
  { icon: Store, title: "Local stores", text: "Buy from trusted shops in your own neighbourhood." },
  { icon: Leaf, title: "Fresh and genuine", text: "Products come from nearby sellers, not distant warehouses." },
  { icon: Bike, title: "Quick delivery", text: "Short distances mean your order reaches you faster." },
];

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: SITE.name,
      url: SITE.url,
      logo: `${SITE.url}/logo-512.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      name: SITE.name,
      url: SITE.url,
      inLanguage: "en-IN",
      publisher: { "@id": `${SITE.url}/#organization` },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd} />

      <section className="overflow-hidden bg-gradient-to-b from-[#fdf1dc] via-[#fdf8f0] to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-deep ring-1 ring-brand/30">
              Your neighbourhood, online
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
              Your local stores, <span className="text-brand-deep">delivered to your door</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted">
              360mart brings the shops around you online. Fresh fruits, meat and fish, groceries and fashion from sellers you can trust.
            </p>
            <a
              href="#categories"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-white shadow-lg shadow-ink/25 hover:bg-ink/85"
            >
              Start shopping →
            </a>
          </div>

          <HeroVisual />
        </div>
      </section>

      <section id="categories" aria-labelledby="categories-heading" className="mx-auto max-w-6xl scroll-mt-32 px-4 py-12 md:scroll-mt-20">
        <div className="flex items-end justify-between gap-4">
          <h2 id="categories-heading" className="text-2xl font-bold text-ink">
            Shop by category
          </h2>
          <Link href="/categories" className="-my-2 flex min-h-10 shrink-0 items-center gap-1 text-sm font-semibold text-brand-deep hover:underline">
            All categories <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <Suspense fallback={<CategoryGridSkeleton />}>
          <HomeCategories />
        </Suspense>
      </section>

      <section aria-labelledby="why-heading" className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 id="why-heading" className="text-2xl font-bold text-ink">
            Why shop on 360mart?
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="rounded-2xl bg-white p-6 ring-1 ring-line">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
                  <item.icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-3 font-bold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

// The categories come only from the backend (GET /categories), in the order the
// admin set. A category with its own designed folder (fruits) links there.
async function HomeCategories() {
  const loaded = await getShopCategoriesNow();
  if (!loaded.ok) {
    return (
      <p role="alert" className="mt-6 rounded-2xl bg-surface px-5 py-6 text-sm text-muted ring-1 ring-line">
        We couldn&apos;t load the categories right now. Please refresh the page in a moment.
      </p>
    );
  }
  const categories = loaded.data;
  if (!categories.length) {
    return (
      <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center">
        <Store aria-hidden className="size-8 text-brand-deep" />
        <p className="mt-3 font-bold text-ink">Categories are on their way</p>
        <p className="mt-1 max-w-sm text-sm text-muted">Local stores are getting ready. Check back soon.</p>
      </div>
    );
  }
  return (
    <>
      <JsonLd data={categoryListJsonLd("Shop by category", categories.map((c) => ({ name: c.name, path: categoryPath(c) })))} />
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {categories.map((category, i) => (
          <li key={category.categoryId}>
            <CategoryCard category={category} priority={i < 2} />
          </li>
        ))}
      </ul>
    </>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}
