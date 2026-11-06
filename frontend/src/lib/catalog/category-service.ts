import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Category } from "./types";

// The server's category reads (public, no session). The admin's writes go
// straight from the browser: lib/catalog/admin-client.ts.

// Public reads are cached (lib/catalog/data.ts), and a cached function can't
// read the visitor's request headers, so these are sent without them.
const NO_VISITOR = { incoming: new Headers() };

export function listTopLevelCategories() {
  return callApi<Category[]>("/categories", NO_VISITOR);
}

export function listSubcategories(categoryId: number) {
  return callApi<Category[]>(`/categories/${categoryId}/subcategories`, NO_VISITOR);
}
