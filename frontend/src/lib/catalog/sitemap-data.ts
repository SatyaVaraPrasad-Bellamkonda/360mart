import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { callApi } from "@/lib/backend/client";
import { CATEGORIES_TAG, CATEGORY_PAGES_TAG, PRODUCTS_TAG } from "./data";

// The whole visible catalogue for sitemap.xml, from ONE backend call
// (GET /sitemap): only active categories, subcategories and products, in the
// shop's order, with the same productCount as the category pages' summary.
// Picture links here are permanent public links (not the ~1 h signed ones).

export type SitemapProduct = { id: number; slug: string; lastModified: string | null; imageUrl: string | null };
type SitemapGroup = { id: number; slug: string; lastModified: string | null; productCount: number; imageUrl: string | null };
export type SitemapSubcategory = SitemapGroup & { products: SitemapProduct[] };
export type SitemapCategory = SitemapGroup & { subcategories: SitemapSubcategory[] };
export type SitemapData = { generatedAt: string; categories: SitemapCategory[] };

// A cached function can't read the visitor's headers, so none are sent.
const NO_VISITOR = { incoming: new Headers() };

async function cachedSitemap(): Promise<SitemapData> {
  "use cache";
  // The same tags as the shop pages: an admin save that changes a page changes the sitemap too.
  cacheTag(CATEGORIES_TAG, PRODUCTS_TAG, CATEGORY_PAGES_TAG);
  // Google reads it a few times a day at most; the backend says an hour is enough.
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  const res = await callApi<SitemapData>("/sitemap", NO_VISITOR);
  // A failed call throws, so it is never cached: the next request tries again.
  if (!res.ok) throw new Error(res.error.code);
  return res.data;
}

/** The catalogue for the sitemap, read at request time (a build without the backend can't bake in an empty list); null when the backend can't be reached. */
export async function getSitemapNow(): Promise<SitemapData | null> {
  await connection();
  try {
    return await cachedSitemap();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}
