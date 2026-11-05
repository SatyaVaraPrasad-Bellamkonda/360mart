import { api, type ApiResult } from "@/lib/api-client";
import type { Category } from "@/lib/catalog/types";
import { categoryHref } from "@/lib/catalog/validation";
import type { SearchResult } from "@/lib/home-page/service";
import { cleanQuery, SUGGEST_SIZE } from "./query";

/** A top-level category, enough to build a subcategory's link and name its parent. */
export type ParentCategory = Pick<Category, "categoryId" | "slug" | "name">;
export type Suggestions = Pick<SearchResult, "products"> & { categories: (Category & { href: string; parentName: string | null })[] };

/**
 * Type-ahead suggestions while typing, straight from the browser
 * (GET /api/v1/search?…&suggest=true: visible in Network, not counted as a
 * search). `parents` = the header's top-level categories, for the links.
 */
export async function loadSuggestions(q: string, parents: ParentCategory[], signal?: AbortSignal): Promise<ApiResult<Suggestions>> {
  const text = cleanQuery(q);
  if (!text) return { ok: true, data: { products: { items: [], page: 0, size: SUGGEST_SIZE, totalItems: 0, totalPages: 0 }, categories: [] } };
  const query = new URLSearchParams({ q: text, page: "0", size: String(SUGGEST_SIZE), suggest: "true" });
  const res = await api<SearchResult>(`/search?${query}`, { signal });
  if (!res.ok) return res;
  return {
    ok: true,
    data: {
      products: res.data.products,
      categories: (res.data.categories ?? []).map((c) => ({ ...c, href: categoryHref(c, parents), parentName: parents.find((t) => t.categoryId === c.parentCategoryId)?.name ?? null })),
    },
  };
}
