"use server";

import { updateTag } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import type { ApiFailure } from "@/lib/backend/client";
import { CATEGORY_PAGES_TAG, categoryPageTag, getShopProductsPage } from "@/lib/catalog/data";
import { categoryImageError, parseCategoryId } from "@/lib/catalog/validation";
import type { Product } from "@/lib/catalog/types";
import type { Page } from "@/lib/inventory/types";
import * as api from "./service";
import type { AdminCategoryPage, PageHistoryItem, PageImagePurpose } from "./types";
import { cleanDocument, pageErrors, readPageDocument } from "./validation";

// Category page actions. The shop's "Show more products" is public; everything
// else is the admin page editor (checked here, and again by the backend).

// The page call returns the first 24; "Show more" loads 24 at a time.
const PRODUCTS_PAGE_SIZE = 24;

/** The next page of a subcategory's products (the grid's "Show more"). Cached like the page itself. */
export async function loadMoreProductsAction(subcategoryId: number, page: number): Promise<ActionResult<Page<Product>>> {
  if (parseCategoryId(subcategoryId) === null || !Number.isInteger(page) || page < 1 || page > 1000) return fail(error("UNKNOWN", "Something went wrong. Please try again."));
  const res = await getShopProductsPage(subcategoryId, page, PRODUCTS_PAGE_SIZE);
  return res.ok ? { ok: true, data: res.data } : fail({ code: res.error.code, message: res.error.message, fieldErrors: {} });
}

// ---- admin ----

const PURPOSES: PageImagePurpose[] = ["HERO", "HERO_MOBILE", "BANNER", "GUIDE", "OG"];

/** Re-read the editor's data (after a conflict, a discard or a restore). */
export async function loadAdminPageAction(categoryId: number): Promise<ActionResult<AdminCategoryPage>> {
  const token = await adminToken(categoryId);
  if (typeof token !== "string") return fail(token);
  return result(await api.getAdminPage(token, categoryId));
}

/** Save the whole draft. Field problems come back keyed by the backend's paths ("hero.headline", "sections[2]"). */
export async function saveDraftAction(categoryId: number, version: number, isSubcategory: boolean, input: unknown): Promise<ActionResult<{ version: number; message: string }>> {
  const doc = readPageDocument(input);
  if (!doc || !Number.isInteger(version) || version < 0) return fail(unexpected());
  const clean = cleanDocument(doc, isSubcategory);
  const problems = pageErrors(clean, isSubcategory);
  if (Object.keys(problems).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors: problems });
  const token = await adminToken(categoryId);
  if (typeof token !== "string") return fail(token);
  return write(await api.saveDraft(token, categoryId, version, clean));
}

/** Publish the saved draft; the shop shows it at once (the cached page is dropped). */
export async function publishAction(categoryId: number, version: number): Promise<ActionResult<{ version: number; message: string }>> {
  const token = await adminToken(categoryId);
  if (typeof token !== "string") return fail(token);
  const res = await write(await api.publish(token, categoryId, version));
  if (res.ok) {
    updateTag(categoryPageTag(categoryId));
    updateTag(CATEGORY_PAGES_TAG); // the theme shows on category cards in other pages too
  }
  return res;
}

export async function discardDraftAction(categoryId: number, version: number): Promise<ActionResult<{ version: number; message: string }>> {
  const token = await adminToken(categoryId);
  if (typeof token !== "string") return fail(token);
  return write(await api.discardDraft(token, categoryId, version));
}

export async function historyAction(categoryId: number, page: number): Promise<ActionResult<Page<PageHistoryItem>>> {
  if (!Number.isInteger(page) || page < 0) return fail(unexpected());
  const token = await adminToken(categoryId);
  if (typeof token !== "string") return fail(token);
  return result(await api.history(token, categoryId, page));
}

/** Copy a published version into the draft (publish to make it live). */
export async function restoreAction(categoryId: number, version: number, fromVersion: number): Promise<ActionResult<{ version: number; message: string }>> {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) return fail(unexpected());
  const token = await adminToken(categoryId);
  if (typeof token !== "string") return fail(token);
  return write(await api.restore(token, categoryId, version, fromVersion));
}

/** Upload a page picture (JPEG/PNG, ≤ 2 MB); answers with its id for hero.imageId etc. */
export async function uploadPageImageAction(categoryId: number, form: FormData): Promise<ActionResult<{ imageId: string }>> {
  if (!(form instanceof FormData)) return fail(unexpected());
  const purpose = form.get("purpose");
  const image = form.get("image");
  if (!PURPOSES.includes(purpose as PageImagePurpose) || !(image instanceof File) || image.size === 0) return fail(unexpected());
  const problem = categoryImageError(image);
  if (problem) return fail({ code: "INVALID_IMAGE", message: problem, fieldErrors: {} });
  const token = await adminToken(categoryId);
  if (typeof token !== "string") return fail(token);
  const res = await api.uploadImage(token, categoryId, purpose as PageImagePurpose, image);
  if (!res.ok) {
    if (res.error.status === 413) return fail({ code: "IMAGE_TOO_LARGE", message: "The image must be at most 2 MB.", fieldErrors: {} });
    if (res.error.status === 502 || res.error.code === "STORAGE_UNAVAILABLE") return fail(error(res.error.code, "Picture storage is busy right now. Please try again in a minute."));
    return fail(await toError(res.error));
  }
  return { ok: true, data: { imageId: res.data.id } };
}

// ---- helpers ----

async function adminToken(categoryId: number): Promise<string | ActionError> {
  if (parseCategoryId(categoryId) === null) return error("CATEGORY_NOT_FOUND", "Category not found.");
  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return error("UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "admin") return error("FORBIDDEN", "Only admins can design category pages.");
  return token;
}

async function result<T>(res: { ok: true; data: T } | { ok: false; error: ApiFailure }): Promise<ActionResult<T>> {
  return res.ok ? { ok: true, data: res.data } : fail(await toError(res.error));
}

async function write(res: { ok: true; data: { version: number; message: string } } | { ok: false; error: ApiFailure }): Promise<ActionResult<{ version: number; message: string }>> {
  return res.ok ? { ok: true, data: { version: res.data.version, message: res.data.message } } : fail(await toError(res.error));
}

async function toError(failure: ApiFailure): Promise<ActionError> {
  if (failure.code === "UNAUTHENTICATED") await clearSession();
  if (failure.code === "FORBIDDEN") return error("FORBIDDEN", "Only admins can design category pages.");
  return { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors };
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

