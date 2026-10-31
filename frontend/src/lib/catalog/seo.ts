// Search-engine text for category pages, shared by the shop pages and the admin
// form's Google preview, so the admin sees exactly what Google will get.
// Safe for client components.

import type { Metadata } from "next";
import type { CategoryPage } from "@/lib/category-page/types";
import { richTextToPlain } from "@/lib/rich-text";
import { SITE } from "@/lib/site";
import { foodTypeLabel, shopProductPath } from "./product-validation";
import type { Category, Product } from "./types";
import { categoryPath } from "./validation";

type Text = { name: string; seoTitle: string | null; seoDescription: string | null; description: string | null };

/** The page title before the site's " | 360mart" suffix. */
export function categoryTitle(c: Text, parentName?: string): string {
  return c.seoTitle || (parentName ? `${c.name} | ${parentName}` : c.name);
}

export function categoryDescription(c: Text, parentName?: string): string {
  if (c.seoDescription) return c.seoDescription;
  const fromText = c.description && richTextToPlain(c.description);
  if (fromText) return fromText.length > 160 ? `${fromText.slice(0, 157).trimEnd()}…` : fromText;
  return `Shop ${c.name}${parentName ? ` in ${parentName}` : ""} from local stores near you on ${SITE.name}.`;
}

// Master switch for category pages in Google (off while the site is in preview).
// Even when on, a page is only indexed once it has products: an empty category
// would be a thin page. Add them to app/sitemap.ts when this goes on.
export const CATEGORY_PAGES_INDEXABLE = false;

/** schema.org ItemList of the subcategories on a category page. */
export function categoryListJsonLd(name: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE.url}${item.path}`, name: item.name })),
  };
}

/** schema.org FAQPage of a page's questions (answers as plain text, without the formatting marks). */
export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: richTextToPlain(q.answer) } })),
  };
}

/** Metadata of a category or subcategory page from the page API (null = not found: keep it out of Google). */
export function categoryPageMetadata(data: CategoryPage | null): Metadata {
  if (!data) return { robots: { index: false, follow: true } };
  const { category, parent, page, summary } = data;
  const title = categoryTitle(category, parent?.name);
  // The SEO description, else the page's intro (the admin's words for this page), else the category's.
  const intro = page.hero.intro && richTextToPlain(page.hero.intro);
  const fromIntro = intro && (intro.length > 160 ? `${intro.slice(0, 157).trimEnd()}…` : intro);
  const description = category.seoDescription || fromIntro || categoryDescription(category, parent?.name);
  const url = parent ? categoryPath(category, parent) : categoryPath(category);
  const images = page.hero.imageUrl ? [{ url: page.hero.imageUrl, alt: page.hero.imageAlt }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images },
    robots: { index: CATEGORY_PAGES_INDEXABLE && summary.productCount > 0, follow: true },
  };
}

/** The product page title before the site's " | 360mart" suffix. */
export function productTitle(p: Pick<Product, "name" | "seoTitle">, subcategoryName?: string): string {
  return p.seoTitle || (subcategoryName ? `${p.name} | ${subcategoryName}` : p.name);
}

export function productDescription(p: Pick<Product, "name" | "seoDescription" | "shortDescription" | "description">, subcategoryName?: string): string {
  if (p.seoDescription) return p.seoDescription;
  // The description may carry **bold** / list marks: Google gets the words only.
  const fromText = (p.shortDescription?.replace(/\s+/g, " ").trim() || (p.description && richTextToPlain(p.description)));
  if (fromText) return fromText.length > 160 ? `${fromText.slice(0, 157).trimEnd()}…` : fromText;
  return `Buy ${p.name}${subcategoryName ? ` (${subcategoryName})` : ""} from local stores near you on ${SITE.name}.`;
}

/** Metadata of a shared product page (null = not found: keep it out of Google). */
export function productMetadata(data: { category: Category; subcategory: Category; product: Product } | null): Metadata {
  if (!data) return { robots: { index: false, follow: true } };
  const { category, subcategory, product } = data;
  const title = productTitle(product, subcategory.name);
  const description = productDescription(product, subcategory.name);
  const url = shopProductPath(category, subcategory, product);
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, robots: { index: CATEGORY_PAGES_INDEXABLE, follow: true } };
}

/**
 * schema.org Product. No offers yet (no prices), and no image: picture links
 * expire after an hour, so Google would keep a dead link.
 */
export function productJsonLdFrom(product: Product, category: Category, subcategory: Category) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: `${SITE.url}${shopProductPath(category, subcategory, product)}`,
    description: productDescription(product, subcategory.name),
    category: `${category.name} > ${subcategory.name}`,
    ...(product.brand && { brand: { "@type": "Brand", name: product.brand } }),
    ...(product.foodType && { additionalProperty: [{ "@type": "PropertyValue", name: "Food type", value: foodTypeLabel(product.foodType) }] }),
  };
}
