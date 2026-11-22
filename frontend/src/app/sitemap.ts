import type { MetadataRoute } from "next";
import { PRODUCT_LOOKUP_SIZE } from "@/lib/catalog/data";
import { shopProductPath } from "@/lib/catalog/product-validation";
import { CATEGORY_PAGES_INDEXABLE } from "@/lib/catalog/seo";
import { getSitemapNow } from "@/lib/catalog/sitemap-data";
import { categoryPath } from "@/lib/catalog/validation";
import { getPolicies } from "@/lib/legal/data";
import { POLICY_PAGES, POLICY_TYPES } from "@/lib/legal/types";
import { SITE } from "@/lib/site";

// sitemap.xml: every page we want in Google, built from ONE backend call
// (GET /sitemap) plus the cached policy list. Rules mirror the pages' own
// robots tags, so the sitemap never lists a page that says "noindex":
// - categories and subcategories only with products (an empty one is a thin page, noindex);
// - every listed product (the backend lists only active ones with an active size);
// - URLs built with the same helpers as each page's canonical URL.
// Only <lastmod> and pictures are sent: Google ignores priority and changefreq.
// If the backend can't be reached, the fixed pages are still served.

const url = (path: string) => `${SITE.url}${path === "/" ? "" : path}`;
const date = (value: string | null | undefined) => (value ? new Date(value) : undefined);
// Next.js writes picture links into the XML as they are: a "&" in one would break the whole file.
const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const pictures = (imageUrl: string | null) => (imageUrl ? { images: [imageUrl.replace(/[&<>"']/g, (c) => XML_ESCAPES[c])] } : {});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, policies] = await Promise.all([CATEGORY_PAGES_INDEXABLE ? getSitemapNow() : null, getPolicies()]);

  // Policy pages that exist (a missing policy's page would be a 404); all of them if the list can't be read.
  const published = policies.ok ? policies.data.map((p) => ({ type: p.policyType, at: p.publishedAt })) : POLICY_TYPES.map((type) => ({ type, at: null }));
  const entries: MetadataRoute.Sitemap = [
    { url: SITE.url },
    { url: url("/contact") },
    ...published.map((p) => ({ url: url(POLICY_PAGES[p.type].path), lastModified: date(p.at) })),
  ];
  if (!catalog) return entries;

  const shown = catalog.categories.filter((c) => c.productCount > 0);
  if (shown.length) entries.splice(1, 0, { url: url("/categories"), lastModified: latest(shown.map((c) => c.lastModified)) });

  for (const category of shown) {
    entries.push({ url: url(categoryPath(category)), lastModified: date(category.lastModified), ...pictures(category.imageUrl) });
    for (const sub of category.subcategories.filter((s) => s.productCount > 0)) {
      entries.push({ url: url(categoryPath(sub, category)), lastModified: date(sub.lastModified), ...pictures(sub.imageUrl) });
      // A product page can only find the first 100 products of its subcategory
      // (no "product by slug" endpoint yet): never list one that would be a 404.
      for (const product of sub.products.slice(0, PRODUCT_LOOKUP_SIZE)) {
        entries.push({ url: url(shopProductPath(category, sub, product)), lastModified: date(product.lastModified), ...pictures(product.imageUrl) });
      }
    }
  }
  return entries;
}

function latest(values: (string | null)[]): Date | undefined {
  const times = values.map((v) => (v ? Date.parse(v) : NaN)).filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)) : undefined;
}
