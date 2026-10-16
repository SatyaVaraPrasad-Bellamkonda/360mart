import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Category, CategoryInput } from "./types";

// One function per category endpoint. Reads are public (no session); writes are
// admin-only and the backend checks the role on every call (403 FORBIDDEN).

// Public reads are cached (lib/catalog/data.ts), and a cached function can't
// read the visitor's request headers, so these are sent without them.
const NO_VISITOR = { incoming: new Headers() };

export function listTopLevelCategories() {
  return callApi<Category[]>("/categories", NO_VISITOR);
}

export function listSubcategories(categoryId: number) {
  return callApi<Category[]>(`/categories/${categoryId}/subcategories`, NO_VISITOR);
}

export function createCategory(token: string, input: CategoryInput, image: File | null) {
  return callApi<Category>("/admin/categories", { method: "POST", body: multipart(input, image), sessionToken: token });
}

export function updateCategory(token: string, categoryId: number, input: CategoryInput, image: File | null) {
  return callApi<Category>(`/admin/categories/${categoryId}`, { method: "PUT", body: multipart(input, image), sessionToken: token });
}

// Two parts: "category" (JSON, with its own content type, or Spring rejects it)
// and an optional "image". No image part on update = keep the current picture.
function multipart(input: CategoryInput, image: File | null): FormData {
  const form = new FormData();
  form.append("category", new Blob([JSON.stringify(input)], { type: "application/json" }), "category.json");
  if (image) form.append("image", image, image.name || "category-image");
  return form;
}
