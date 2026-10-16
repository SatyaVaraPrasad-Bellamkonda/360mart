"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import type { ApiFailure } from "@/lib/backend/client";
import * as api from "./category-service";
import { CATEGORIES_TAG } from "./data";
import type { CategoryField } from "./types";
import { categoryErrors, categoryImageError, parseCategoryId, readDraft, toCategoryInput } from "./validation";

// Admin category actions. The browser sends the form as FormData: "draft" (the
// fields as JSON) and an optional "image" file. Everything is checked again
// here (browser input can be forged), then the backend checks it once more,
// including that the caller really is an admin.

// Backend conflict codes that belong to one field, so the form can show them there.
const FIELD_OF: Record<string, CategoryField> = {
  CATEGORY_NAME_TAKEN: "name",
  CATEGORY_SLUG_TAKEN: "slug",
  SLUG_REQUIRED: "slug",
  INVALID_PARENT_CATEGORY: "parentCategoryId",
  CATEGORY_HAS_SUBCATEGORIES: "parentCategoryId",
  CATEGORY_HAS_PRODUCTS: "parentCategoryId",
  INVALID_IMAGE: "image",
  IMAGE_TOO_LARGE: "image",
};

/** Create (categoryId = null) or update a category, then go back to the list. */
export async function saveCategoryAction(categoryId: number | null, form: FormData): Promise<ActionResult> {
  if (categoryId !== null && parseCategoryId(categoryId) === null) return fail(error("CATEGORY_NOT_FOUND", "Category not found."));
  if (!(form instanceof FormData)) return fail(unexpected());

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(form.get("draft") ?? ""));
  } catch {
    return fail(unexpected());
  }
  const draft = readDraft(parsed);
  if (!draft) return fail(unexpected());

  const fieldErrors: Record<string, string> = { ...categoryErrors(draft) } as Record<string, string>;
  const image = form.get("image");
  const file = image instanceof File && image.size > 0 ? image : null;
  const imageProblem = file && categoryImageError(file);
  if (imageProblem) fieldErrors.image = imageProblem;
  if (Object.keys(fieldErrors).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors });

  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return fail(error("UNAUTHENTICATED", "Please login to continue."));
  if (user.role !== "admin") return fail(error("FORBIDDEN", "Only admins can change categories."));

  const input = toCategoryInput(draft);
  const res = categoryId === null ? await api.createCategory(token, input, file) : await api.updateCategory(token, categoryId, input, file);
  if (!res.ok) {
    if (res.error.code === "UNAUTHENTICATED") await clearSession();
    return fail(toFieldError(res.error));
  }

  // Shop pages read the categories from the cache: drop it so they show the change at once.
  updateTag(CATEGORIES_TAG);
  revalidatePath("/admin", "layout");
  redirect(`/admin/categories?saved=${categoryId === null ? "added" : "updated"}`);
}

function toFieldError(failure: ApiFailure): ActionError {
  const field = FIELD_OF[failure.code];
  if (field) return { code: failure.code, message: failure.message, fieldErrors: { [field]: failure.message } };
  if (failure.code === "FORBIDDEN") return error("FORBIDDEN", "Only admins can change categories. Log in with an admin account.");
  if (failure.status === 413) return { code: "IMAGE_TOO_LARGE", message: "The image must be at most 2 MB.", fieldErrors: { image: "The image must be at most 2 MB." } };
  return { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors };
}

function error(code: string, message: string): ActionError {
  return { code, message, fieldErrors: {} };
}

function unexpected() {
  return error("UNKNOWN", "Something went wrong. Please try again.");
}

function fail(failure: ActionError): ActionResult {
  return { ok: false, error: { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors } };
}
