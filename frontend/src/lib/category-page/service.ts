import "server-only";
import { callApi } from "@/lib/backend/client";
import type { AdminCategoryPage, CategoryPage } from "./types";

// The server's category page reads: the shop page (public) and the editor's
// first load and previews (admin session; the backend checks the role). The
// editor's saves, publish, history and uploads go straight from the browser:
// lib/category-page/admin-client.ts.

// The shop page is cached on our server and shared by everyone, so it's sent without the visitor's headers.
const NO_VISITOR = { incoming: new Headers() };

/** A top-level id gives the category page, a subcategory id the subcategory page (parent set). */
export function getCategoryPage(categoryId: number) {
  return callApi<CategoryPage>(`/category-pages/${categoryId}`, NO_VISITOR);
}

const base = (categoryId: number) => `/admin/categories/${categoryId}/page`;

export function getAdminPage(token: string, categoryId: number) {
  return callApi<AdminCategoryPage>(base(categoryId), { sessionToken: token });
}

export function preview(token: string, categoryId: number) {
  return callApi<CategoryPage>(`${base(categoryId)}/preview`, { sessionToken: token });
}

export function historyVersion(token: string, categoryId: number, version: number) {
  return callApi<CategoryPage>(`${base(categoryId)}/history/${version}`, { sessionToken: token });
}
