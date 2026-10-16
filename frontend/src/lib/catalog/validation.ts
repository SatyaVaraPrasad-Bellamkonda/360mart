// Category rules, the same as the backend's CategoryRequest.java (checked in the
// browser for instant feedback, again in the server action, and finally by the
// backend). Messages match the backend's, so the admin sees the same text either way.
// Safe for client components.

import { collapse } from "@/lib/addresses/validation";
import type { Category, CategoryDraft, CategoryErrors, CategoryInput } from "./types";

const CATALOG_NAME = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} &,.'()/-]*$/u;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// No control characters or < > (the backend's SAFE_LINE / SAFE_MULTILINE).
const SAFE_LINE = /^[^\x00-\x1F\x7F<>]*$/;
const SAFE_MULTILINE = /^[^\x00-\x09\x0B-\x1F\x7F<>]*$/;

export const CATEGORY_LIMITS = {
  name: 100,
  slug: 60,
  description: 1000,
  badgeLabel: 30,
  seoTitle: 70,
  seoDescription: 160,
  displayOrder: 100_000,
} as const;

export const CATEGORY_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const CATEGORY_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

// Top-level category pages live at /<slug>, next to the site's own pages. A
// category with one of these slugs would never be reachable (the site's page
// wins), so the admin form refuses them. Keep in sync with the folders in src/app
// and planned pages; store slugs will share this list later.
export const RESERVED_SLUGS = new Set([
  "account", "admin", "api", "cart", "category", "categories", "checkout", "forgot-password", "help",
  "images", "login", "logout", "orders", "register", "search", "seller", "sellers", "signup", "store",
  "stores", "vendor",
]);

// Categories that have their own designed page (a folder in src/app, e.g. app/fruits).
// Every other category uses the shared page in app/[category].
export const CUSTOM_CATEGORY_PAGES = new Set(["fruits"]);

/** Same as the backend's SlugUtil: "Fruits & Veggies" → "fruits-and-veggies"; null when nothing usable is left. */
export function slugFromName(name: string): string | null {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CATEGORY_LIMITS.slug)
    .replace(/-+$/, "");
  return slug || null;
}

/** The slug the category will get: the typed one, else the one made from the name. */
export function effectiveSlug(draft: Pick<CategoryDraft, "name" | "slug">): string | null {
  return draft.slug.trim() || slugFromName(collapse(draft.name));
}

export function categoryErrors(draft: CategoryDraft): CategoryErrors {
  const errors: CategoryErrors = {};
  const name = collapse(draft.name);
  if (!name) errors.name = "Name is required";
  else if (name.length > CATEGORY_LIMITS.name) errors.name = `Name must be at most ${CATEGORY_LIMITS.name} characters`;
  else if (!CATALOG_NAME.test(name)) errors.name = "Name can contain letters, digits, spaces and & , . ' ( ) / -";

  const slug = draft.slug.trim();
  if (slug.length > CATEGORY_LIMITS.slug) errors.slug = `Slug must be at most ${CATEGORY_LIMITS.slug} characters`;
  else if (slug && !SLUG.test(slug)) errors.slug = "Slug can contain only lowercase letters, digits and single hyphens (e.g. fresh-fruits)";
  else if (name && !errors.name && !effectiveSlug(draft)) errors.slug = "Could not build a URL slug from this name. Please enter a slug (e.g. fresh-fruits).";
  else if (draft.parentCategoryId === null && RESERVED_SLUGS.has(effectiveSlug(draft) ?? "")) {
    errors.slug = `"/${effectiveSlug(draft)}" is already used by the site. Choose another slug.`;
  }

  const description = draft.description.trim();
  if (description.length > CATEGORY_LIMITS.description) errors.description = `Description must be at most ${CATEGORY_LIMITS.description} characters`;
  else if (!SAFE_MULTILINE.test(description)) errors.description = "Description contains characters that are not allowed";

  const line = (key: "badgeLabel" | "seoTitle" | "seoDescription", label: string) => {
    const value = collapse(draft[key]);
    if (value.length > CATEGORY_LIMITS[key]) errors[key] = `${label} must be at most ${CATEGORY_LIMITS[key]} characters`;
    else if (!SAFE_LINE.test(value)) errors[key] = `${label} contains characters that are not allowed`;
  };
  line("badgeLabel", "Badge label");
  line("seoTitle", "SEO title");
  line("seoDescription", "SEO description");

  const order = draft.displayOrder.trim();
  if (order && !/^\d+$/.test(order)) errors.displayOrder = "Display order must be a whole number";
  else if (Number(order) > CATEGORY_LIMITS.displayOrder) errors.displayOrder = `Display order must be at most ${CATEGORY_LIMITS.displayOrder}`;

  if (draft.parentCategoryId !== null && !(Number.isSafeInteger(draft.parentCategoryId) && draft.parentCategoryId > 0)) {
    errors.parentCategoryId = "Choose an existing top-level category as the parent.";
  }
  return errors;
}

/** Problem with a chosen picture, or undefined when it's fine. The backend checks again. */
export function categoryImageError(file: { type: string; size: number }): string | undefined {
  if (!CATEGORY_IMAGE_TYPES.includes(file.type)) return "Use a JPEG or PNG image.";
  if (file.size > CATEGORY_IMAGE_MAX_BYTES) return "The image must be at most 2 MB.";
  return undefined;
}

/** Every field, every time: the update replaces the whole category, and a missing field would be cleared. */
export function toCategoryInput(draft: CategoryDraft): CategoryInput {
  const optional = (value: string) => collapse(value) || null;
  return {
    parentCategoryId: draft.parentCategoryId,
    name: collapse(draft.name),
    slug: draft.slug.trim() || null,
    description: draft.description.trim() || null,
    badgeLabel: optional(draft.badgeLabel),
    seoTitle: optional(draft.seoTitle),
    seoDescription: optional(draft.seoDescription),
    displayOrder: Number(draft.displayOrder.trim() || 0),
    isFeatured: draft.isFeatured,
    isActive: draft.isActive,
  };
}

export function toDraft(category: Category): CategoryDraft {
  return {
    parentCategoryId: category.parentCategoryId,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    badgeLabel: category.badgeLabel ?? "",
    seoTitle: category.seoTitle ?? "",
    seoDescription: category.seoDescription ?? "",
    displayOrder: String(category.displayOrder),
    isFeatured: category.isFeatured,
    isActive: category.isActive,
  };
}

export function emptyDraft(parentCategoryId: number | null = null): CategoryDraft {
  return {
    parentCategoryId,
    name: "",
    slug: "",
    description: "",
    badgeLabel: "",
    seoTitle: "",
    seoDescription: "",
    displayOrder: "0",
    isFeatured: false,
    isActive: true,
  };
}

/** A draft from untrusted input (a server action argument), or null when it isn't shaped like one. */
export function readDraft(input: unknown): CategoryDraft | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const text = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : null);
  const parent = raw.parentCategoryId;
  if (parent !== null && typeof parent !== "number") return null;
  const values = {
    name: text("name"),
    slug: text("slug"),
    description: text("description"),
    badgeLabel: text("badgeLabel"),
    seoTitle: text("seoTitle"),
    seoDescription: text("seoDescription"),
    displayOrder: text("displayOrder"),
  };
  if (Object.values(values).some((v) => v === null)) return null;
  if (typeof raw.isFeatured !== "boolean" || typeof raw.isActive !== "boolean") return null;
  return { ...(values as Record<keyof typeof values, string>), parentCategoryId: parent, isFeatured: raw.isFeatured, isActive: raw.isActive };
}

/** Whether a URL segment could be a category slug at all (anything else is a 404 without asking the backend). */
export function isSlug(value: string): boolean {
  return value.length <= CATEGORY_LIMITS.slug && SLUG.test(value);
}

/** Category ids are positive whole numbers; anything else can't exist. */
export function parseCategoryId(value: unknown): number | null {
  const id = typeof value === "number" ? value : typeof value === "string" && /^\d{1,15}$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Shop URL of a category: /fresh-fruits, or /fresh-fruits/apples for a subcategory. */
export function categoryPath(category: Pick<Category, "slug">, parent?: Pick<Category, "slug"> | null): string {
  return parent ? `/${parent.slug}/${category.slug}` : `/${category.slug}`;
}
