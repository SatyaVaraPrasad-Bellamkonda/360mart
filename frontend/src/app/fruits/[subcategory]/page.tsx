import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FaqSection } from "@/components/FaqSection";
import { JsonLd } from "@/components/JsonLd";
import { SortableProductGrid } from "@/components/SortableProductGrid";
import { getProducts, getSubcategories, getSubcategory } from "@/lib/api";
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
    openGraph: { title: subcategory.seoTitle, description: subcategory.seoDescription, url },
  };
}

export default async function FruitSubcategoryPage({ params }: PageProps<"/fruits/[subcategory]">) {
  const { subcategory: slug } = await params;
  const subcategory = await getSubcategory("fruits", slug);
  if (!subcategory) notFound();

  const [products, siblings] = await Promise.all([getProducts("fruits", slug), getSubcategories("fruits")]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      <JsonLd data={itemListJsonLd(subcategory.name, products)} />
      <Breadcrumbs
        items={[
          { name: "Fruits", href: "/fruits" },
          { name: subcategory.name, href: `/fruits/${subcategory.slug}` },
        ]}
      />

      <header className={`flex items-center justify-between gap-6 rounded-3xl p-6 sm:p-10 ${subcategory.tint}`}>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Fresh {subcategory.name}</h1>
          <p className="mt-2 max-w-xl text-muted">{subcategory.intro[0]}</p>
        </div>
        <span aria-hidden className="hidden text-8xl sm:block">
          {subcategory.emoji}
        </span>
      </header>

      <nav aria-label="Other fruit types">
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {siblings.map((s) => (
            <li key={s.slug} className="shrink-0">
              <Link
                href={`/fruits/${s.slug}`}
                aria-current={s.slug === slug ? "page" : undefined}
                className="block rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
              >
                {s.emoji} {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-label={`${subcategory.name} products`}>
        <SortableProductGrid products={products} />
      </section>

      {subcategory.intro.length > 1 && (
        <section aria-labelledby="about-heading" className="rounded-3xl bg-surface p-6 sm:p-8">
          <h2 id="about-heading" className="text-xl font-bold text-ink">
            About {subcategory.name.toLowerCase()}
          </h2>
          <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
            {subcategory.intro.slice(1).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      <FaqSection title={`${subcategory.name}: frequently asked questions`} faqs={subcategory.faqs} />
    </div>
  );
}
