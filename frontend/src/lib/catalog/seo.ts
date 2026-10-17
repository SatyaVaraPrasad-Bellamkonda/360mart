// Search-engine text for category pages, shared by the shop pages and the admin
// form's Google preview, so the admin sees exactly what Google will get.
// Safe for client components.

import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import type { Category } from "./types";
import { categoryPath } from "./validation";

type Text = { name: string; seoTitle: string | null; seoDescription: string | null; description: string | null };

/** The page title before the site's " | 360mart" suffix. */
export function categoryTitle(c: Text, parentName?: string): string {
  return c.seoTitle || (parentName ? `${c.name} | ${parentName}` : c.name);
}

export function categoryDescription(c: Text, parentName?: string): string {
  if (c.seoDescription) return c.seoDescription;
  const fromText = c.description?.replace(/\s+/g, " ").trim();
  if (fromText) return fromText.length > 160 ? `${fromText.slice(0, 157).trimEnd()}…` : fromText;
  return `Shop ${c.name}${parentName ? ` in ${parentName}` : ""} from local stores near you on ${SITE.name}.`;
}

// Category pages have no products yet, so they'd be thin pages for Google.
// Keep them out of the index (links are still followed) until products exist;
// then switch this on and add them to app/sitemap.ts.
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

/** Metadata of a shared subcategory page (null = not found: keep it out of Google). */
export function subcategoryMetadata(data: { category: Category; subcategory: Category } | null): Metadata {
  if (!data) return { robots: { index: false, follow: true } };
  const { category, subcategory } = data;
  const title = categoryTitle(subcategory, category.name);
  const description = categoryDescription(subcategory, category.name);
  const url = categoryPath(subcategory, category);
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, robots: { index: CATEGORY_PAGES_INDEXABLE, follow: true } };
}
