import type { MetadataRoute } from "next";
import { getProducts, getSubcategories, USES_SAMPLE_DATA } from "@/lib/api";
import { productPath } from "@/lib/paths";
import { SITE } from "@/lib/site";

// Only categories whose pages exist and are backed by real data belong here.
// Add a category to this list once its pages are built.
const CATALOG_CATEGORIES = ["fruits"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [{ url: SITE.url, changeFrequency: "daily", priority: 1 }];

  // Sample data must never be submitted to Google.
  if (USES_SAMPLE_DATA) return entries;

  for (const category of CATALOG_CATEGORIES) {
    const [subcategories, products] = await Promise.all([getSubcategories(category), getProducts(category)]);
    entries.push(
      { url: `${SITE.url}/${category}`, changeFrequency: "daily", priority: 0.9 },
      ...subcategories.map((s) => ({
        url: `${SITE.url}/${category}/${s.slug}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...products.map((p) => ({ url: `${SITE.url}${productPath(p)}`, changeFrequency: "daily" as const, priority: 0.7 })),
    );
  }
  return entries;
}
