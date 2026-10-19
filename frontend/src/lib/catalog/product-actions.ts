"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import type { ApiFailure } from "@/lib/backend/client";
import { PRODUCTS_TAG } from "./data";
import * as api from "./product-service";
import { productErrors, readProductDraft, readVariantDraft, toProductInput, toVariantInput, variantErrors } from "./product-validation";
import type { ProductField, ProductVariant, VariantDraft } from "./types";
import { categoryImageError, parseCategoryId } from "./validation";

// Admin product and size actions. Same pattern as the category actions: check
// everything again here (browser input can be forged), then the backend checks
// it once more, including that the caller really is an admin.

// Backend codes that belong to one field, so the form can show them there.
const PRODUCT_FIELD_OF: Record<string, ProductField> = {
  PRODUCT_NAME_TAKEN: "name",
  PRODUCT_SLUG_TAKEN: "slug",
  PRODUCT_ALREADY_EXISTS: "name",
  SLUG_REQUIRED: "slug",
  INVALID_PRODUCT_CATEGORY: "categoryId",
  INVALID_IMAGE: "image",
  IMAGE_TOO_LARGE: "image",
  FILE_TOO_LARGE: "image", // over the server's ~6 MB upload limit
};

const VARIANT_FIELD_OF: Record<string, keyof VariantDraft> = {
  VARIANT_LABEL_TAKEN: "label",
  VARIANT_AMOUNT_TAKEN: "quantity",
  VARIANT_SKU_TAKEN: "sku",
  VARIANT_ALREADY_EXISTS: "label",
};

/**
 * Create (productId = null) or update a product. A new product goes to its
 * page to add sizes next; an edit goes back to its subcategory's list.
 */
export async function saveProductAction(productId: number | null, form: FormData): Promise<ActionResult> {
  if (productId !== null && parseCategoryId(productId) === null) return fail(error("PRODUCT_NOT_FOUND", "Product not found."));
  if (!(form instanceof FormData)) return fail(unexpected());

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(form.get("draft") ?? ""));
  } catch {
    return fail(unexpected());
  }
  const draft = readProductDraft(parsed);
  if (!draft) return fail(unexpected());

  const fieldErrors: Record<string, string> = { ...productErrors(draft) } as Record<string, string>;
  const image = form.get("image");
  const file = image instanceof File && image.size > 0 ? image : null;
  const imageProblem = file && categoryImageError(file);
  if (imageProblem) fieldErrors.image = imageProblem;
  if (Object.keys(fieldErrors).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors });

  const token = await adminToken();
  if (typeof token !== "string") return fail(token);

  const input = toProductInput(draft);
  const res = productId === null ? await api.createProduct(token, input, file) : await api.updateProduct(token, productId, input, file);
  if (!res.ok) return fail(await toProductError(res.error));

  changed();
  // The form says which category the subcategory is in, so the next page needn't look it up.
  const parent = parseCategoryId(form.get("parentCategoryId"));
  const where = parent ? `category=${parent}&sub=${res.data.categoryId}` : "";
  if (productId === null) redirect(`/admin/products/${res.data.productId}?${where}&saved=added`);
  redirect(where ? `/admin/products?${where}&saved=updated` : "/admin/products");
}

/** Add (variantId = null) or update one size. Stays on the page; the caller refreshes the list. */
export async function saveVariantAction(productId: number, variantId: number | null, input: unknown): Promise<ActionResult<ProductVariant>> {
  if (parseCategoryId(productId) === null) return fail(error("PRODUCT_NOT_FOUND", "Product not found."));
  if (variantId !== null && parseCategoryId(variantId) === null) return fail(error("VARIANT_NOT_FOUND", "Size not found for this product."));
  const draft = readVariantDraft(input);
  if (!draft) return fail(unexpected());
  const fieldErrors = variantErrors(draft) as Record<string, string>;
  if (Object.keys(fieldErrors).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors });

  const token = await adminToken();
  if (typeof token !== "string") return fail(token);

  const body = toVariantInput(draft);
  const res = variantId === null ? await api.createVariant(token, productId, body) : await api.updateVariant(token, productId, variantId, body);
  if (!res.ok) {
    if (res.error.code === "UNAUTHENTICATED") await clearSession();
    const field = VARIANT_FIELD_OF[res.error.code];
    if (field) return fail({ code: res.error.code, message: res.error.message, fieldErrors: { [field]: res.error.message } });
    if (res.error.code === "FORBIDDEN") return fail(forbidden());
    return fail({ code: res.error.code, message: res.error.message, fieldErrors: res.error.fieldErrors });
  }
  changed();
  return { ok: true, data: res.data };
}

/** The session token of a signed-in admin, or the error to show. */
async function adminToken(): Promise<string | ActionError> {
  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return error("UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "admin") return forbidden();
  return token;
}

// Shop pages read products from the cache: drop it so they show the change at once.
function changed() {
  updateTag(PRODUCTS_TAG);
  revalidatePath("/admin", "layout");
}

async function toProductError(failure: ApiFailure): Promise<ActionError> {
  if (failure.code === "UNAUTHENTICATED") await clearSession();
  const field = PRODUCT_FIELD_OF[failure.code];
  if (field) return { code: failure.code, message: failure.message, fieldErrors: { [field]: failure.message } };
  if (failure.code === "FORBIDDEN") return forbidden();
  if (failure.status === 413) return { code: "IMAGE_TOO_LARGE", message: "The image must be at most 2 MB.", fieldErrors: { image: "The image must be at most 2 MB." } };
  if (failure.status === 502 || failure.code === "STORAGE_UNAVAILABLE") return error(failure.code, "Picture storage is busy right now. Please try saving again in a minute.");
  return { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors };
}

function forbidden() {
  return error("FORBIDDEN", "Only admins can change products. Log in with an admin account.");
}

function error(code: string, message: string): ActionError {
  return { code, message, fieldErrors: {} };
}

function unexpected() {
  return error("UNKNOWN", "Something went wrong. Please try again.");
}

function fail(failure: ActionError): { ok: false; error: ActionError } {
  return { ok: false, error: { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors } };
}
