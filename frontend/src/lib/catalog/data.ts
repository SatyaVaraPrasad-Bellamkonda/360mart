import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import type { ApiFailure } from "@/lib/backend/client";
import * as api from "./category-service";
import * as productApi from "./product-service";
import type { Category, Product } from "./types";
import { PRODUCT_LIMITS } from "./product-validation";
import { isSlug, SLUG } from "./validation";

const isProductSlug = (value: string) => value.length <= PRODUCT_LIMITS.slug && SLUG.test(value);

// Category data for pages.
//
// Shop pages: cached on our server and shared by all visitors, so a page view
// doesn't call the backend each time. Admin saves clear the cache at once
// (updateTag in actions.ts). The picture links inside expire after about an
// hour, so an entry is never kept longer than 45 minutes.
//
// Admin pages: always live from the backend (the admin must see what's saved).

export const CATEGORIES_TAG = "categories";
export const PRODUCTS_TAG = "products";

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

async function cachedProducts(subcategoryId: number): Promise<Product[]> {
  "use cache";
  cacheTag(PRODUCTS_TAG, CATEGORIES_TAG); // hiding a subcategory hides its products too
  cacheLife({ stale: 300, revalidate: 900, expire: 2700 });
  const res = await productApi.listProducts(subcategoryId);
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

/** Active subcategories of one category (cached; [] when it's hidden or gone). */
export function getShopSubcategories(categoryId: number): Promise<Loaded<Category[]>> {
  return attempt(() => cachedSubcategories(categoryId));
}

/** A top-level category and its active subcategories, or data: null when there is no such (active) category. */
export function getShopCategory(slug: string): Promise<Loaded<{ category: Category; subcategories: Category[] } | null>> {
  return attempt(async () => {
    const category = (await cachedTopLevel()).find((c) => c.slug === slug);
    if (!category) return null;
    return { category, subcategories: await cachedSubcategories(category.categoryId) };
  });
}

export type ShopSubcategory = { category: Category; subcategories: Category[]; subcategory: Category; products: Product[] };

/** A subcategory with its parent, siblings and products, or data: null when either isn't an active category. */
export async function getShopSubcategory(parentSlug: string, slug: string): Promise<Loaded<ShopSubcategory | null>> {
  if (!isSlug(parentSlug) || !isSlug(slug)) return { ok: true, data: null };
  const loaded = await getShopCategory(parentSlug);
  if (!loaded.ok) return loaded;
  const subcategory = loaded.data?.subcategories.find((s) => s.slug === slug);
  if (!loaded.data || !subcategory) return { ok: true, data: null };
  const { category, subcategories } = loaded.data;
  return attempt(async () => ({ category, subcategories, subcategory, products: await cachedProducts(subcategory.categoryId) }));
}

/** A product page: the product with its subcategory (and the others in it), or data: null when it isn't shown in the shop. */
export async function getShopProduct(parentSlug: string, subSlug: string, slug: string): Promise<Loaded<(ShopSubcategory & { product: Product }) | null>> {
  if (!isProductSlug(slug)) return { ok: true, data: null };
  const loaded = await getShopSubcategory(parentSlug, subSlug);
  if (!loaded.ok || !loaded.data) return loaded as Loaded<null>;
  const product = loaded.data.products.find((p) => p.slug === slug);
  return { ok: true, data: product ? { ...loaded.data, product } : null };
}

// Admin loaders: always live, and one backend call each. Pages load only what
// they show (subcategories once a category is chosen, products of one
// subcategory), never one call per category: there's no tree endpoint.

/** Live top-level categories (active only: there's no admin list with hidden ones yet). */
export async function loadTopCategories(): Promise<Loaded<Category[]>> {
  const res = await api.listTopLevelCategories();
  return res.ok ? { ok: true, data: res.data } : res;
}

/** Live subcategories of one category ([] when it's hidden or gone). */
export async function loadSubcategories(categoryId: number): Promise<Loaded<Category[]>> {
  const res = await api.listSubcategories(categoryId);
  if (!res.ok && res.error.code === "CATEGORY_NOT_FOUND") return { ok: true, data: [] };
  return res.ok ? { ok: true, data: res.data } : res;
}

/** Live products of a subcategory for the admin pages (only those shown in the shop: there's no admin list yet). */
export async function loadProducts(subcategoryId: number): Promise<Loaded<Product[]>> {
  const res = await productApi.listProducts(subcategoryId);
  if (!res.ok && res.error.code === "CATEGORY_NOT_FOUND") return { ok: true, data: [] };
  return res.ok ? { ok: true, data: res.data } : res;
}
