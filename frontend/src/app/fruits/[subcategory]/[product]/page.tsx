import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { OfferPicker } from "@/components/OfferPicker";
import { PriceTag } from "@/components/PriceTag";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { getProduct, getProducts, getRelatedProducts, getSubcategory } from "@/lib/api";
import { formatPrice } from "@/lib/format";
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

  const related = await getRelatedProducts(product);
  const [variant] = product.variants;
  const cheapest = variant.offers.find((o) => o.inStock);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-6">
      <JsonLd data={productJsonLd(product)} />
      <Breadcrumbs
        items={[
          { name: "Fruits", href: "/fruits" },
          { name: subcategory.name, href: `/fruits/${subcategory.slug}` },
          { name: product.name, href: productPath(product) },
        ]}
      />

      <article className="grid gap-8 md:grid-cols-2">
        <ProductImage
          name={product.name}
          emoji={product.emoji}
          image={product.image}
          tint={product.tint}
          size="large"
          preload
        />

        <div className="space-y-5">
          <div>
            <SeasonBadge inSeason={product.inSeason} />
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{product.name}</h1>
            <p className="mt-1 text-muted">{product.shortDescription}</p>
          </div>

          <div>
            <PriceTag price={cheapest?.price ?? null} mrp={cheapest?.mrp ?? null} size="lg" />
            {cheapest && <p className="text-sm text-muted">Best price for {variant.label} today</p>}
          </div>

          <OfferPicker variants={product.variants} />
        </div>
      </article>

      <section aria-labelledby="about-heading" className="space-y-4">
        <h2 id="about-heading" className="text-xl font-bold text-ink">
          About {product.name}
        </h2>
        <p className="max-w-3xl leading-relaxed text-muted">{product.description}</p>
        <FruitFacts product={product} />
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-xl font-bold text-ink">
            You may also like
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.slug} className="flex">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
