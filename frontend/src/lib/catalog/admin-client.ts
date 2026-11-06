import { failed, failure, invalid, refreshPages, toActionError, unexpected, uploadFailed } from "@/lib/admin/refresh";
import { api, type ApiError } from "@/lib/api-client";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { PRODUCT_SHEET_API, productSheetFileError, type SheetIssue } from "./product-sheet";
import { productErrors, toProductInput, toVariantInput, VARIANT_LIMITS, variantErrors } from "./product-validation";
import type { Category, CategoryDraft, CategoryField, CategoryInput, Product, ProductDraft, ProductField, ProductInput, ProductVariant, VariantDraft } from "./types";
import { categoryErrors, categoryImageError, parseCategoryId, toCategoryInput } from "./validation";

// The admin catalog screens' calls (categories, products, sizes, the product
// sheet upload), made straight from the browser to /api/v1/admin/... so each
// shows in DevTools → Network. Everything is checked here first with the same
// rules as before; the backend checks it again, including that the caller
// really is an admin (403 FORBIDDEN otherwise). After a change, our cached
// shop pages are marked stale (refreshPages) before the screen moves on.

// Backend conflict codes that belong to one field, so the form can show them there.
const CATEGORY_FIELD_OF: Record<string, CategoryField> = {
  CATEGORY_NAME_TAKEN: "name",
  CATEGORY_SLUG_TAKEN: "slug",
  SLUG_REQUIRED: "slug",
  INVALID_PARENT_CATEGORY: "parentCategoryId",
  CATEGORY_HAS_SUBCATEGORIES: "parentCategoryId",
  CATEGORY_HAS_PRODUCTS: "parentCategoryId",
  INVALID_IMAGE: "image",
  IMAGE_TOO_LARGE: "image",
  FILE_TOO_LARGE: "image", // over the server's ~6 MB upload limit
};

const PRODUCT_FIELD_OF: Record<string, ProductField> = {
  PRODUCT_NAME_TAKEN: "name",
  PRODUCT_SLUG_TAKEN: "slug",
  PRODUCT_ALREADY_EXISTS: "name",
  SLUG_REQUIRED: "slug",
  INVALID_PRODUCT_CATEGORY: "categoryId",
  INVALID_IMAGE: "image",
  IMAGE_TOO_LARGE: "image",
  FILE_TOO_LARGE: "image",
};

const VARIANT_FIELD_OF: Record<string, keyof VariantDraft> = {
  VARIANT_LABEL_TAKEN: "label",
  VARIANT_AMOUNT_TAKEN: "quantity",
  VARIANT_SKU_TAKEN: "sku",
  VARIANT_ALREADY_EXISTS: "label",
};

const CATEGORY_FORBIDDEN = "Only admins can change categories. Log in with an admin account.";
const PRODUCT_FORBIDDEN = "Only admins can change products. Log in with an admin account.";
const IMAGE_TOO_BIG = "The image must be at most 2 MB.";

// ---- categories ----

/**
 * The subcategories of one category, fetched when the admin picks or opens it
 * (one call, never one per category). A category that's gone has none.
 */
export async function fetchSubcategories(categoryId: number): Promise<ActionResult<Category[]>> {
  if (parseCategoryId(categoryId) === null) return failure("CATEGORY_NOT_FOUND", "Category not found.");
  const res = await api<Category[]>(`/categories/${categoryId}/subcategories`);
  if (res.ok) return { ok: true, data: res.data };
  if (res.error.code === "CATEGORY_NOT_FOUND") return { ok: true, data: [] };
  return failed(res.error);
}

/** Create (categoryId = null) or update a category. On success: where to go next (the list). */
export async function saveCategory(categoryId: number | null, draft: CategoryDraft, image: File | null): Promise<ActionResult<{ next: string }>> {
  if (categoryId !== null && parseCategoryId(categoryId) === null) return failure("CATEGORY_NOT_FOUND", "Category not found.");
  const fieldErrors: Record<string, string> = { ...categoryErrors(draft) } as Record<string, string>;
  const file = image && image.size > 0 ? image : null;
  const imageProblem = file && categoryImageError(file);
  if (imageProblem) fieldErrors.image = imageProblem;
  if (Object.keys(fieldErrors).length) return invalid(fieldErrors);

  const body = multipart("category", toCategoryInput(draft), file);
  const res = categoryId === null ? await api<Category>("/admin/categories", { method: "POST", body }) : await api<Category>(`/admin/categories/${categoryId}`, { method: "PUT", body });
  if (!res.ok) return { ok: false, error: fieldError(res.error, CATEGORY_FIELD_OF, CATEGORY_FORBIDDEN) };

  // Shop pages read the categories from the cache: drop it so they show the change at once.
  await refreshPages("categories");
  // A subcategory: open its parent's branch in the tree (that branch is the only one loaded).
  const open = res.data.parentCategoryId ? `&open=${res.data.parentCategoryId}` : "";
  return { ok: true, data: { next: `/admin/categories?saved=${categoryId === null ? "added" : "updated"}${open}` } };
}

// ---- products ----

/**
 * Create (productId = null) or update a product. A new product goes on to its
 * page to add sizes; an edit goes back to its subcategory's list.
 * parentCategoryId = the subcategory's category, so the next page needn't look it up.
 */
export async function saveProduct(productId: number | null, draft: ProductDraft, image: File | null, parentCategoryId: number | null): Promise<ActionResult<{ next: string }>> {
  if (productId !== null && parseCategoryId(productId) === null) return failure("PRODUCT_NOT_FOUND", "Product not found.");
  const fieldErrors: Record<string, string> = { ...productErrors(draft) } as Record<string, string>;
  const file = image && image.size > 0 ? image : null;
  const imageProblem = file && categoryImageError(file);
  if (imageProblem) fieldErrors.image = imageProblem;
  if (Object.keys(fieldErrors).length) return invalid(fieldErrors);

  const body = multipart("product", toProductInput(draft), file);
  const res = productId === null ? await api<Product>("/admin/products", { method: "POST", body }) : await api<Product>(`/admin/products/${productId}`, { method: "PUT", body });
  if (!res.ok) {
    if (res.error.status === 502 || res.error.code === "STORAGE_UNAVAILABLE") return uploadFailed(res.error);
    return { ok: false, error: fieldError(res.error, PRODUCT_FIELD_OF, PRODUCT_FORBIDDEN) };
  }

  await refreshPages("products");
  const parent = parseCategoryId(parentCategoryId);
  const where = parent ? `category=${parent}&sub=${res.data.categoryId}` : "";
  if (productId === null) return { ok: true, data: { next: `/admin/products/${res.data.productId}?${where}&saved=added` } };
  return { ok: true, data: { next: where ? `/admin/products?${where}&saved=updated` : "/admin/products" } };
}

/**
 * Add 1–20 sizes in one request (all or nothing). Row problems come back as
 * fieldErrors keyed like the backend's: "variants[2].label" = row 3's label.
 * The caller re-reads the list (router.refresh) on success.
 */
export async function addVariants(productId: number, drafts: VariantDraft[]): Promise<ActionResult<{ message: string }>> {
  if (parseCategoryId(productId) === null) return failure("PRODUCT_NOT_FOUND", "Product not found.");
  if (!Array.isArray(drafts) || drafts.length < 1 || drafts.length > VARIANT_LIMITS.perProduct) return unexpected();
  const fieldErrors: Record<string, string> = {};
  drafts.forEach((draft, i) => {
    for (const [field, message] of Object.entries(variantErrors(draft))) if (message) fieldErrors[`variants[${i}].${field}`] = message;
  });
  if (Object.keys(fieldErrors).length) return invalid(fieldErrors);

  const res = await api<{ success: boolean; message: string; ids: string[] }>(`/admin/products/${productId}/variants`, { method: "POST", body: { variants: drafts.map(toVariantInput) } });
  if (!res.ok) return failed(res.error, PRODUCT_FORBIDDEN);
  await refreshPages("products");
  return { ok: true, data: { message: res.data.message || `Added ${drafts.length} ${drafts.length === 1 ? "size" : "sizes"}.` } };
}

/** Update one size (PUT replaces it whole, so hide / show sends every field too). The caller refreshes the list. */
export async function saveVariant(productId: number, variantId: number, draft: VariantDraft): Promise<ActionResult<ProductVariant>> {
  if (parseCategoryId(productId) === null) return failure("PRODUCT_NOT_FOUND", "Product not found.");
  if (parseCategoryId(variantId) === null) return failure("VARIANT_NOT_FOUND", "Size not found for this product.");
  const fieldErrors = variantErrors(draft) as Record<string, string>;
  if (Object.keys(fieldErrors).length) return invalid(fieldErrors);

  const res = await api<ProductVariant>(`/admin/products/${productId}/variants/${variantId}`, { method: "PUT", body: toVariantInput(draft) });
  if (!res.ok) return { ok: false, error: fieldError(res.error, VARIANT_FIELD_OF, PRODUCT_FORBIDDEN) };
  await refreshPages("products");
  return { ok: true, data: res.data };
}

// ---- product sheet ----

export type ProductSheetFailure = { code: string; message: string; issues: SheetIssue[] };
export type ProductSheetResult = { ok: true; message: string } | { ok: false; error: ProductSheetFailure };

/**
 * Upload the edited product sheet. All or nothing on the backend: every row
 * is applied, or nothing is and every problem comes back with its tab, row and
 * column (SHEET_INVALID).
 */
export async function uploadProductSheet(file: File | null): Promise<ProductSheetResult> {
  if (!file) return sheetFail("VALIDATION_FAILED", "Choose the sheet to upload.");
  const problem = productSheetFileError(file);
  if (problem) return sheetFail("SHEET_UNREADABLE", problem);

  const body = new FormData();
  body.append("file", file, file.name);
  const res = await api<{ success: boolean; message: string }>(PRODUCT_SHEET_API, { method: "POST", body });
  if (!res.ok) {
    if (res.error.status === 413 || res.error.code === "FILE_TOO_LARGE") return sheetFail("FILE_TOO_LARGE", "The file is too big. Upload the sheet you downloaded (at most 5 MB).");
    if (res.error.code === "FORBIDDEN") return sheetFail("FORBIDDEN", "Only admins can upload the product sheet.");
    return { ok: false, error: { code: res.error.code, message: res.error.message, issues: res.error.issues } };
  }
  // Shop pages read products from the cache: drop it so they show the change at once.
  await refreshPages("products");
  return { ok: true, message: res.data.message };
}

// ---- helpers ----

// Two parts: the JSON (with its own content type, or Spring answers 415) and an
// optional "image". No image part on update = keep the current picture.
function multipart(part: "category" | "product", input: CategoryInput | ProductInput, image: File | null): FormData {
  const form = new FormData();
  form.append(part, new Blob([JSON.stringify(input)], { type: "application/json" }), `${part}.json`);
  if (image) form.append("image", image, image.name || `${part}-image`);
  return form;
}

/** A conflict that belongs to one field lands under it; a 413 is the picture's size. */
function fieldError(error: ApiError, fieldOf: Record<string, string>, forbidden: string): ActionError {
  const field = fieldOf[error.code];
  if (field) return { code: error.code, message: error.message, fieldErrors: { [field]: error.message } };
  if (error.status === 413) return { code: "IMAGE_TOO_LARGE", message: IMAGE_TOO_BIG, fieldErrors: { image: IMAGE_TOO_BIG } };
  return toActionError(error, forbidden);
}

function sheetFail(code: string, message: string): { ok: false; error: ProductSheetFailure } {
  return { ok: false, error: { code, message, issues: [] } };
}
