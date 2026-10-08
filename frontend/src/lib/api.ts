// Every page gets its data through these functions, never from sample data
// directly. When the Spring Boot backend is ready, only the bodies below
// change (to fetch from it); pages and components stay the same.

import { FRUIT_PRODUCTS, FRUIT_SUBCATEGORIES, SAMPLE_STORES } from "./sample-data/fruits";
import type { Product, ProductDetail, ProductSummary, Store, Subcategory } from "./types";

// While true, catalog pages are noindex, left out of the sitemap and show a
// preview banner, so made-up stores and prices never reach Google.
export const USES_SAMPLE_DATA = true;

const SUBCATEGORIES: Subcategory[] = [...FRUIT_SUBCATEGORIES];
const PRODUCTS: Product[] = [...FRUIT_PRODUCTS];
const STORES: Store[] = [...SAMPLE_STORES];

export async function getSubcategories(category: string): Promise<Subcategory[]> {
  "use cache";
  return SUBCATEGORIES.filter((s) => s.category === category).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getSubcategory(category: string, slug: string): Promise<Subcategory | null> {
  "use cache";
  return SUBCATEGORIES.find((s) => s.category === category && s.slug === slug) ?? null;
}

export async function getProducts(category: string, subcategory?: string): Promise<ProductSummary[]> {
  "use cache";
  return PRODUCTS.filter((p) => p.category === category && (!subcategory || p.subcategory === subcategory)).map(
    toSummary,
  );
}

export async function getProduct(category: string, subcategory: string, slug: string): Promise<ProductDetail | null> {
  "use cache";
  const product = PRODUCTS.find(
    (p) => p.category === category && p.subcategory === subcategory && p.slug === slug,
  );
  if (!product) return null;

  return {
    ...product,
    tint: tintFor(product),
    variants: product.variants.map((variant) => ({
      ...variant,
      offers: variant.offers
        .map((offer) => ({ ...offer, store: STORES.find((s) => s.slug === offer.storeSlug)! }))
        .sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price),
    })),
  };
}

// Other products from the same subcategory, then the rest of the category,
// with anything out of stock moved to the end.
export async function getRelatedProducts(
  product: Pick<Product, "category" | "subcategory" | "slug">,
  limit = 4,
): Promise<ProductSummary[]> {
  "use cache";
  const others = PRODUCTS.filter((p) => p.category === product.category && p.slug !== product.slug);
  const sameType = others.filter((p) => p.subcategory === product.subcategory);
  const rest = others.filter((p) => p.subcategory !== product.subcategory);
  return [...sameType, ...rest]
    .map(toSummary)
    .sort((a, b) => Number(b.price !== null) - Number(a.price !== null))
    .slice(0, limit);
}

function tintFor(product: Product): string {
  return SUBCATEGORIES.find((s) => s.slug === product.subcategory)?.tint ?? "bg-surface";
}

// Listing price = cheapest in-stock offer for the product's first variant.
function toSummary(product: Product): ProductSummary {
  const [variant] = product.variants;
  const inStock = variant.offers.filter((o) => o.inStock);
  const cheapest = inStock.reduce<(typeof inStock)[number] | null>(
    (best, o) => (!best || o.price < best.price ? o : best),
    null,
  );

  return {
    slug: product.slug,
    category: product.category,
    subcategory: product.subcategory,
    name: product.name,
    emoji: product.emoji,
    image: product.image,
    shortDescription: product.shortDescription,
    inSeason: product.inSeason,
    variantLabel: variant.label,
    price: cheapest?.price ?? null,
    mrp: cheapest?.mrp ?? null,
    sellerCount: inStock.length,
    tint: tintFor(product),
  };
}

