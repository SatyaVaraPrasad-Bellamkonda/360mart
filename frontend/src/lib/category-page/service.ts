import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Page } from "@/lib/inventory/types";
import type { AdminCategoryPage, CategoryPage, PageDocument, PageHistoryItem, PageImagePurpose, PageWriteResult } from "./types";

// One function per category page endpoint. The shop read is public; the admin
// ones need an admin session (the backend checks the role on every call).

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

export function saveDraft(token: string, categoryId: number, version: number, page: PageDocument) {
  return callApi<PageWriteResult>(`${base(categoryId)}/draft`, { method: "PUT", body: { version, page }, sessionToken: token });
}

export function discardDraft(token: string, categoryId: number, version: number) {
  return callApi<PageWriteResult>(`${base(categoryId)}/draft/discard`, { method: "POST", body: { version }, sessionToken: token });
}

export function publish(token: string, categoryId: number, version: number) {
  return callApi<PageWriteResult>(`${base(categoryId)}/publish`, { method: "POST", body: { version }, sessionToken: token });
}

export function preview(token: string, categoryId: number) {
  return callApi<CategoryPage>(`${base(categoryId)}/preview`, { sessionToken: token });
}

export function history(token: string, categoryId: number, page: number) {
  return callApi<Page<PageHistoryItem>>(`${base(categoryId)}/history?page=${page}&size=20`, { sessionToken: token });
}

export function historyVersion(token: string, categoryId: number, version: number) {
  return callApi<CategoryPage>(`${base(categoryId)}/history/${version}`, { sessionToken: token });
}

export function restore(token: string, categoryId: number, version: number, fromVersion: number) {
  return callApi<PageWriteResult>(`${base(categoryId)}/restore`, { method: "POST", body: { version, fromVersion }, sessionToken: token });
}

/** Multipart: "purpose" (a form field) and "image". Answers with the new picture's id. */
export function uploadImage(token: string, categoryId: number, purpose: PageImagePurpose, image: File) {
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("image", image, image.name || "page-image");
  return callApi<{ success: boolean; message: string; id: string }>(`${base(categoryId)}/images`, { method: "POST", body: form, sessionToken: token });
}
