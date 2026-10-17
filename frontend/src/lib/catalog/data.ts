import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import type { ApiFailure } from "@/lib/backend/client";
import * as api from "./category-service";
import type { Category, CategoryNode } from "./types";
import { isSlug } from "./validation";

// Category data for pages.
//
// Shop pages: cached on our server and shared by all visitors, so a page view
// doesn't call the backend each time. Admin saves clear the cache at once
// (updateTag in actions.ts). The picture links inside expire after about an
// hour, so an entry is never kept longer than 45 minutes.
//
// Admin pages: always live from the backend (the admin must see what's saved).

export const CATEGORIES_TAG = "categories";

type Loaded<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

const UNAVAILABLE: ApiFailure = {
  status: 0,
  code: "API_UNAVAILABLE",
  message: "We couldn't connect to 360mart right now. Please try again in a moment.",
  fieldErrors: {},
};

class LoadError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.code);
  }
}

// A failed call throws, so it is never cached: the next visitor tries again.
async function cachedTopLevel(): Promise<Category[]> {
  "use cache";
  cacheTag(CATEGORIES_TAG);
  cacheLife({ stale: 300, revalidate: 900, expire: 2700 });
  const res = await api.listTopLevelCategories();
  if (!res.ok) throw new LoadError(res.error);
  return res.data;
}

async function cachedSubcategories(categoryId: number): Promise<Category[]> {
  "use cache";
  cacheTag(CATEGORIES_TAG);
  cacheLife({ stale: 300, revalidate: 900, expire: 2700 });
  const res = await api.listSubcategories(categoryId);
  // A hidden or deleted parent: no subcategories to show (the page shows 404 for the parent anyway).
  if (!res.ok && res.error.code === "CATEGORY_NOT_FOUND") return [];
  if (!res.ok) throw new LoadError(res.error);
  return res.data;
}

async function attempt<T>(load: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    unstable_rethrow(error); // Next.js's own signals (prerender aborts) must pass through
    // An error crossing the cache boundary may lose its class, so fall back to a generic one.
    return { ok: false, error: error instanceof LoadError ? error.failure : UNAVAILABLE };
  }
}

/** Active top-level categories, in display order (the backend's order). */
export function getShopCategories(): Promise<Loaded<Category[]>> {
  return attempt(cachedTopLevel);
}

/**
 * The same, for parts of the site frame and home page (header, footer, home
 * grid): read at request time (from the cache), never at build time, so a build
 * without the backend can't bake an empty menu into the static page.
 */
export async function getShopCategoriesNow(): Promise<Loaded<Category[]>> {
  await connection();
  return getShopCategories();
}

/** Every active category with its active subcategories (the /categories page). */
export async function getShopTree(): Promise<Loaded<CategoryNode[]>> {
  await connection();
  return attempt(async () => {
    const top = await cachedTopLevel();
    const children = await Promise.all(top.map((c) => cachedSubcategories(c.categoryId)));
    return top.map((category, i) => ({ category, children: children[i] }));
  });
}

/** A top-level category and its active subcategories, or data: null when there is no such (active) category. */
export function getShopCategory(slug: string): Promise<Loaded<{ category: Category; subcategories: Category[] } | null>> {
  return attempt(async () => {
    const category = (await cachedTopLevel()).find((c) => c.slug === slug);
    if (!category) return null;
    return { category, subcategories: await cachedSubcategories(category.categoryId) };
  });
}

/** A subcategory with its parent and siblings, or data: null when either isn't an active category. */
export async function getShopSubcategory(parentSlug: string, slug: string): Promise<Loaded<{ category: Category; subcategories: Category[]; subcategory: Category } | null>> {
  if (!isSlug(parentSlug) || !isSlug(slug)) return { ok: true, data: null };
  const loaded = await getShopCategory(parentSlug);
  if (!loaded.ok) return loaded;
  const subcategory = loaded.data?.subcategories.find((s) => s.slug === slug);
  return { ok: true, data: loaded.data && subcategory ? { ...loaded.data, subcategory } : null };
}

/** Live tree for the admin pages: each top-level category with its subcategories. */
export async function loadCategoryTree(): Promise<Loaded<CategoryNode[]>> {
  const top = await api.listTopLevelCategories();
  if (!top.ok) return top;
  const children = await Promise.all(top.data.map((c) => api.listSubcategories(c.categoryId)));
  const nodes: CategoryNode[] = [];
  for (const [i, category] of top.data.entries()) {
    const res = children[i];
    // Hidden in the meantime (another admin): leave it out like the backend does.
    if (!res.ok && res.error.code === "CATEGORY_NOT_FOUND") continue;
    if (!res.ok) return res;
    nodes.push({ category, children: res.data });
  }
  return { ok: true, data: nodes };
}

/** Finds a category (top-level or sub) in the tree; parent is set for a subcategory. */
export function findInTree(tree: CategoryNode[], categoryId: number): { category: Category; parent: Category | null } | null {
  for (const node of tree) {
    if (node.category.categoryId === categoryId) return { category: node.category, parent: null };
    const child = node.children.find((c) => c.categoryId === categoryId);
    if (child) return { category: child, parent: node.category };
  }
  return null;
}
