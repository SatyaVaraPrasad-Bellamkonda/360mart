import { Store } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryCard, CategoryCardSkeleton } from "@/components/CategoryCard";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeView } from "@/components/home/HomeView";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/SectionHeading";
import { getHomePageNow, getShopCategoriesNow } from "@/lib/catalog/data";
import { categoryListJsonLd } from "@/lib/catalog/seo";
import type { Category } from "@/lib/catalog/types";
import { categoryPath } from "@/lib/catalog/validation";
import { HOME_DEFAULTS, STANDARD_FLOATING_LABELS, type HomeHeroView } from "@/lib/home-page/types";
import { indiaMinutes } from "@/lib/home-page/validation";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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
      // The site search box in Google results.
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" },
    },
  ],
};

/** The standard hero: shown when the design can't be loaded. */
const STANDARD_HERO: HomeHeroView = {
  headline: HOME_DEFAULTS.headline,
  accentLine: HOME_DEFAULTS.accentLine,
  intro: HOME_DEFAULTS.intro,
  badge: HOME_DEFAULTS.badge,
  buttonLabel: HOME_DEFAULTS.buttonLabel,
  buttonLink: HOME_DEFAULTS.buttonLink,
  visual: "CART_ANIMATION",
  imageId: null,
  imageUrl: null,
  mobileImageId: null,
  mobileImageUrl: null,
  imageAlt: null,
  floatingLabels: STANDARD_FLOATING_LABELS,
  enabled: true,
  layout: "IMAGE_RIGHT",
  size: "LARGE",
  showBadge: true,
  animation: "NONE",
};

// The home page as the admin designed it (/admin/home), from one cached call.
export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <Suspense fallback={<HomeSkeleton />}>
        <DesignedHome />
      </Suspense>
    </>
  );
}

async function DesignedHome() {
  const [page, categories] = await Promise.all([getHomePageNow(), getShopCategoriesNow()]);
  if (!page.ok) return <StandardHome categories={categories.ok ? categories.data : null} />;
  // Read after the data (the request has started), so this is the time of this visit.
  const minute = indiaMinutes(new Date());
  return <HomeView data={page.data} minute={minute} parents={categories.ok ? categories.data : []} />;
}

/** The design couldn't be loaded: the standard hero and every category, so shoppers can still start. */
function StandardHome({ categories }: { categories: Category[] | null }) {
  return (
    <>
      <HomeHero hero={STANDARD_HERO} />
      <section id="categories" aria-labelledby="categories-heading" className="mx-auto max-w-6xl scroll-mt-32 px-4 py-12 md:scroll-mt-24">
        <SectionHeading id="categories-heading" title="Shop by category" />
        {!categories ? (
          <p role="alert" className="rounded-2xl bg-surface px-5 py-6 text-sm text-muted ring-1 ring-line">
            We couldn&apos;t load the categories right now. Please refresh the page in a moment.
          </p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-surface px-6 py-12 text-center">
            <Store aria-hidden className="size-8 text-brand-deep" />
            <p className="mt-3 font-bold text-ink">Categories are on their way</p>
            <p className="mt-1 max-w-sm text-sm text-muted">Local stores are getting ready. Check back soon.</p>
          </div>
        ) : (
          <>
            <JsonLd data={categoryListJsonLd("Shop by category", categories.map((c) => ({ name: c.name, path: categoryPath(c) })))} />
            <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {categories.map((category, i) => (
                <li key={category.categoryId}>
                  <CategoryCard category={category} priority={i < 2} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}

// While the design loads: neutral shapes only. Never the standard hero, which
// would flash a banner the admin may have changed or switched off.
function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div aria-hidden className="mx-auto max-w-6xl px-4 pt-8">
        <div className="h-4 w-40 animate-pulse rounded-full bg-surface" />
        <div className="mt-4 h-9 w-full max-w-md animate-pulse rounded-xl bg-surface sm:h-11" />
        <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded-full bg-surface" />
      </div>
      <div aria-hidden className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 h-7 w-48 animate-pulse rounded-lg bg-surface" />
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
