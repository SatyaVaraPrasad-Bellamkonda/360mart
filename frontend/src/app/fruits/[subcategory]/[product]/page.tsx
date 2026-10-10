import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { OfferPicker } from "@/components/OfferPicker";
import { ProductImage } from "@/components/ProductImage";
import { ProductRail } from "@/components/ProductRail";
import { SectionHeading } from "@/components/SectionHeading";
import { getProduct, getProducts, getRelatedProducts, getSubcategory } from "@/lib/api";
import { discountPercent, formatPrice } from "@/lib/format";
import { productPath } from "@/lib/paths";
import { productJsonLd } from "@/lib/seo";
import { FruitFacts } from "../../components/FruitFacts";
import { SeasonBadge } from "../../components/SeasonBadge";

type Props = PageProps<"/fruits/[subcategory]/[product]">;

// Pre-build a page for every fruit product at build time.
export async function generateStaticParams() {
  const products = await getProducts("fruits");
  return products.map((p) => ({ subcategory: p.subcategory, product: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subcategory, product: slug } = await params;
  const product = await getProduct("fruits", subcategory, slug);
  if (!product) return {};

  const [variant] = product.variants;
  const prices = variant.offers.filter((o) => o.inStock).map((o) => o.price);
  const priceText = prices.length ? ` from ${formatPrice(Math.min(...prices))} / ${variant.label}` : "";
  const title = `${product.name} – Buy Online${priceText}`;
  const description = `${product.shortDescription}. ${product.description}`.slice(0, 160);
  const url = productPath(product);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, ...(product.image && { images: [product.image] }) },
  };
}

export default async function FruitProductPage({ params }: Props) {
  const { subcategory: subSlug, product: slug } = await params;
  const [product, subcategory] = await Promise.all([
    getProduct("fruits", subSlug, slug),
    getSubcategory("fruits", subSlug),
  ]);
  if (!product || !subcategory) notFound();

  const related = await getRelatedProducts(product, 8);
  const defaultOffer = product.variants[0].offers.find((o) => o.inStock);
  const off = defaultOffer ? discountPercent(defaultOffer.price, defaultOffer.mrp) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-5 sm:space-y-16 sm:py-6">
      <JsonLd data={productJsonLd(product)} />

      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { name: "Fruits", href: "/fruits" },
            { name: subcategory.name, href: `/fruits/${subcategory.slug}` },
            { name: product.name, href: productPath(product) },
          ]}
        />

        <article className="grid gap-6 md:grid-cols-2 md:gap-10 lg:gap-14">
          {/* Photo stays in view while the details scroll on larger screens */}
          <div className="md:sticky md:top-24 md:self-start">
            <div className="relative">
              <ProductImage
                name={product.name}
                image={product.image}
                sizes="(min-width: 1024px) 540px, (min-width: 768px) 50vw, 100vw"
                className="aspect-square rounded-3xl ring-1 ring-line"
                preload
                zoomOnHover={false}
              />
              <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                {off > 0 && (
                  <span className="rounded-lg bg-fresh px-2 py-1 text-xs font-bold text-white shadow">{off}% OFF</span>
                )}
                <SeasonBadge inSeason={product.inSeason} />
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted">Image for representation. Actual product may vary.</p>
          </div>

          <div className="space-y-6 motion-safe:animate-fade-up">
            <div>
              <Link
                href={`/fruits/${subcategory.slug}`}
                className="-my-3 inline-block py-3 text-xs font-semibold uppercase tracking-wider text-fresh hover:underline"
              >
                {subcategory.name}
              </Link>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{product.name}</h1>
              <p className="mt-2 text-muted">{product.shortDescription}</p>
            </div>

            <OfferPicker variants={product.variants} />
          </div>
        </article>
      </div>

      <section aria-labelledby="about-heading" className="reveal space-y-4">
        <h2 id="about-heading" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          About {product.name}
        </h2>
        <p className="max-w-3xl leading-relaxed text-muted">{product.description}</p>
        <FruitFacts product={product} />
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="reveal">
          <SectionHeading id="related-heading" title="You may also like" />
          <ProductRail products={related} />
        </section>
      )}
    </div>
  );
}
