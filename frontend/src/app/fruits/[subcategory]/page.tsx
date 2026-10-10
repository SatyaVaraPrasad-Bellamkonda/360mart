import { Leaf, Package, Tag } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqSection } from "@/components/FaqSection";
import { JsonLd } from "@/components/JsonLd";
import { ProductBrowser } from "@/components/ProductBrowser";
import { getCatalogStats, getProducts, getSubcategories, getSubcategory } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { itemListJsonLd } from "@/lib/seo";

// Pre-build a page for every fruit type at build time.
export async function generateStaticParams() {
  const subcategories = await getSubcategories("fruits");
  return subcategories.map((s) => ({ subcategory: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/fruits/[subcategory]">): Promise<Metadata> {
  const { subcategory: slug } = await params;
  const subcategory = await getSubcategory("fruits", slug);
  if (!subcategory) return {};

  const url = `/fruits/${subcategory.slug}`;
  return {
    title: subcategory.seoTitle,
    description: subcategory.seoDescription,
    alternates: { canonical: url },
    openGraph: { title: subcategory.seoTitle, description: subcategory.seoDescription, url, images: [subcategory.image] },
  };
}

export default async function FruitSubcategoryPage({ params }: PageProps<"/fruits/[subcategory]">) {
  const { subcategory: slug } = await params;
  const subcategory = await getSubcategory("fruits", slug);
  if (!subcategory) notFound();

  const [products, siblings, stats] = await Promise.all([
    getProducts("fruits", slug),
    getSubcategories("fruits"),
    getCatalogStats("fruits", slug),
  ]);

  const facts = [
    { icon: Package, text: `${stats.productCount} ${stats.productCount === 1 ? "variety" : "varieties"}` },
    ...(stats.lowestPrice !== null ? [{ icon: Tag, text: `From ${formatPrice(stats.lowestPrice)}` }] : []),
    { icon: Leaf, text: stats.inSeasonCount > 0 ? `${stats.inSeasonCount} in season` : "Off season now" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-5 sm:space-y-10 sm:py-6">
      <JsonLd data={itemListJsonLd(subcategory.name, products)} />

      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { name: "Fruits", href: "/fruits" },
            { name: subcategory.name, href: `/fruits/${subcategory.slug}` },
          ]}
        />

        {/* Banner: photo on top for phones, beside the text on larger screens */}
        <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-line md:grid md:grid-cols-[1fr_1.1fr]">
          <div className="relative aspect-[16/9] overflow-hidden md:order-2 md:aspect-auto md:min-h-80">
            <Image
              src={subcategory.image}
              alt={`Fresh ${subcategory.name.toLowerCase()}`}
              fill
              preload
              sizes="(min-width: 768px) 600px, 100vw"
              className="object-cover motion-safe:animate-ken-burns"
            />
          </div>
          <div className="flex flex-col justify-center p-5 sm:p-8 md:order-1 lg:p-10">
            <Link href="/fruits" className="-my-3 inline-block py-3 text-xs font-semibold uppercase tracking-wider text-fresh hover:underline">
              Fruits
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink motion-safe:animate-fade-up sm:text-4xl">
              Fresh {subcategory.name}
            </h1>
            <p className="mt-3 text-muted motion-safe:animate-fade-up motion-safe:[animation-delay:100ms]">{subcategory.intro[0]}</p>
            <ul className="mt-5 flex flex-wrap gap-2 motion-safe:animate-fade-up motion-safe:[animation-delay:200ms]">
              {facts.map(({ icon: Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-line">
                  <Icon aria-hidden className="size-4 text-fresh" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Switch between fruit types */}
      <nav aria-label="Fruit types">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {siblings.map((s) => (
            <li key={s.slug} className="shrink-0">
              <Link
                href={`/fruits/${s.slug}`}
                aria-current={s.slug === slug ? "page" : undefined}
                className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-4 text-sm font-semibold text-ink transition hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
              >
                <span className="relative size-8 overflow-hidden rounded-full">
                  <Image src={s.image} alt="" fill sizes="32px" className="object-cover" />
                </span>
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-label={`${subcategory.name} products`}>
        <ProductBrowser products={products} />
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-10">
        <section aria-labelledby="about-heading" className="reveal rounded-3xl bg-surface p-5 sm:p-8">
          <h2 id="about-heading" className="text-xl font-extrabold tracking-tight text-ink">
            About {subcategory.name.toLowerCase()}
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
            {subcategory.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
        <div className="reveal">
          <FaqSection title={`${subcategory.name}: frequently asked questions`} faqs={subcategory.faqs} />
        </div>
      </div>
    </div>
  );
}
