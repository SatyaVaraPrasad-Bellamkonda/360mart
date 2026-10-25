import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import type { ApiFailure } from "@/lib/backend/client";
import * as pageApi from "@/lib/category-page/service";
import type { CategoryPage } from "@/lib/category-page/types";
import type { Page } from "@/lib/inventory/types";
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
/** Every category page; plus "category-page:<id>" on the pages of one category (and its subcategories). */
export const CATEGORY_PAGES_TAG = "category-pages";
export const categoryPageTag = (categoryId: number) => `category-page:${categoryId}`;

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

const EMPTY_PAGE: Page<Product> = { items: [], page: 0, size: 0, totalItems: 0, totalPages: 0 };

async function cachedProductPage(subcategoryId: number, page: number, size: number): Promise<Page<Product>> {
  "use cache";
  cacheTag(PRODUCTS_TAG, CATEGORIES_TAG); // hiding a subcategory hides its products too
  cacheLife({ stale: 300, revalidate: 900, expire: 2700 });
  const res = await productApi.listProducts(subcategoryId, page, size);
  if (!res.ok && res.error.code === "CATEGORY_NOT_FOUND") return EMPTY_PAGE;
  if (!res.ok) throw new LoadError(res.error);
  return res.data;
}

// The whole category page in one call (category, theme, hero, sections, rails,
// counts, first products), by category id (ids never change; slugs do on a
// rename). Nothing in it depends on the visitor or the location, so one cached
// copy serves everyone; publishing a design or saving a category or product
// clears it (updateTag).
async function cachedCategoryPage(categoryId: number): Promise<CategoryPage | null> {
  "use cache";
  cacheTag(CATEGORY_PAGES_TAG, CATEGORIES_TAG, PRODUCTS_TAG, categoryPageTag(categoryId));
  cacheLife({ stale: 300, revalidate: 300, expire: 2700 });
  const res = await pageApi.getCategoryPage(categoryId);
  if (!res.ok && res.error.code === "CATEGORY_NOT_FOUND") return null;
  if (!res.ok) throw new LoadError(res.error);
  const { category, parent } = res.data;
  cacheTag(categoryPageTag(category.categoryId), ...(parent ? [categoryPageTag(parent.categoryId)] : []));
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

/**
 * A category page from the shop URL (/meat or /meat/chicken); data: null when
 * there's no such active category. The URL has slugs and the API wants an id:
 * the id comes from the cached category lists (the same ones the header uses),
 * so it costs no extra backend call on a warm cache.
 */
export function getCategoryPage(slug: string, subSlug?: string): Promise<Loaded<CategoryPage | null>> {
  if (!isSlug(slug) || (subSlug !== undefined && !isSlug(subSlug))) return Promise.resolve({ ok: true, data: null });
  return attempt(async () => {
    const top = (await cachedTopLevel()).find((c) => c.slug === slug);
    if (!top) return null;
    const target = subSlug === undefined ? top : (await cachedSubcategories(top.categoryId)).find((c) => c.slug === subSlug);
    if (!target) return null;
    const page = await cachedCategoryPage(target.categoryId);
    // The URL's level must match the page's (a subcategory's slug isn't a top-level page).
    return page && (subSlug === undefined) === (page.parent === null) ? page : null;
  });
}

/** A category page by id (the admin editor knows the id already). */
export function getCategoryPageById(categoryId: number): Promise<Loaded<CategoryPage | null>> {
  return attempt(() => cachedCategoryPage(categoryId));
}

/** One more page of a subcategory's products ("Show more" on the grid), cached like the page. */
export function getShopProductsPage(subcategoryId: number, page: number, size: number): Promise<Loaded<Page<Product>>> {
  return attempt(() => cachedProductPage(subcategoryId, page, size));
}

export type ShopSubcategory = { category: Category; subcategories: Category[]; subcategory: Category; products: Product[]; page: CategoryPage };

/** A subcategory with its parent, siblings and first products, or data: null when either isn't an active category. */
export async function getShopSubcategory(parentSlug: string, slug: string): Promise<Loaded<ShopSubcategory | null>> {
  const loaded = await getCategoryPage(parentSlug, slug);
  if (!loaded.ok || !loaded.data || !loaded.data.parent) return loaded.ok ? { ok: true, data: null } : loaded;
  const page = loaded.data;
  return { ok: true, data: { category: page.parent!, subcategories: page.subcategories, subcategory: page.category, products: page.products?.items ?? [], page } };
}

// The product list is paged and there's no "product by slug" endpoint yet: a
// product page looks in the page's first products, then in the first 100 (one
// cached call). Products further down need GET /products/by-slug (asked for).
const PRODUCT_LOOKUP_SIZE = 100;

/** A product page: the product with its subcategory (and the others in it), or data: null when it isn't shown in the shop. */
export async function getShopProduct(parentSlug: string, subSlug: string, slug: string): Promise<Loaded<(ShopSubcategory & { product: Product }) | null>> {
  if (!isProductSlug(slug)) return { ok: true, data: null };
  const loaded = await getShopSubcategory(parentSlug, subSlug);
  if (!loaded.ok || !loaded.data) return loaded as Loaded<null>;
  const sub = loaded.data;
  let product = sub.products.find((p) => p.slug === slug);
  const more = sub.page.products && sub.page.products.totalItems > sub.products.length;
  if (!product && (more || !sub.page.products)) {
    const wider = await getShopProductsPage(sub.subcategory.categoryId, 0, PRODUCT_LOOKUP_SIZE);
    if (!wider.ok) return wider;
    product = wider.data.items.find((p) => p.slug === slug);
    if (!sub.products.length) sub.products = wider.data.items;
  }
  return { ok: true, data: product ? { ...sub, product } : null };
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

/** Live products of a subcategory for the admin pages, one page (only those shown in the shop: there's no admin list yet). */
export async function loadProducts(subcategoryId: number, page = 0, size = 100): Promise<Loaded<Page<Product>>> {
  const res = await productApi.listProducts(subcategoryId, page, size);
  if (!res.ok && res.error.code === "CATEGORY_NOT_FOUND") return { ok: true, data: EMPTY_PAGE };
  return res.ok ? { ok: true, data: res.data } : res;
}
