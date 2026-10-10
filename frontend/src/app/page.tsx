import { Bike, Leaf, Store } from "lucide-react";
import type { Metadata } from "next";
import { CategoryCard } from "@/components/CategoryCard";
import { HeroVisual } from "@/components/HeroVisual";
import { JsonLd } from "@/components/JsonLd";
import { LIVE_CATEGORIES } from "@/lib/categories";
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
        <h2 id="categories-heading" className="text-2xl font-bold text-ink">
          Shop by category
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {LIVE_CATEGORIES.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
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
