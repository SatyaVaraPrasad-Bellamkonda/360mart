import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Category } from "@/lib/catalog/types";
import type { PageImagePurpose, ProductCard } from "@/lib/category-page/types";
import type { Page } from "@/lib/inventory/types";
import type { AdminHomePage, HomeHistoryItem, HomePage, HomePageDocument } from "./types";

// One function per home page, search and "buy again" endpoint. The shop read
// and search are public; buy again needs the shopper; the rest needs an admin.

// The home page is cached on our server and shared by everyone, so it's sent without the visitor's headers.
const NO_VISITOR = { incoming: new Headers() };

export function getHomePage() {
  return callApi<HomePage>("/home-page", NO_VISITOR);
}

const base = "/admin/home-page";

export function getAdminPage(token: string) {
  return callApi<AdminHomePage>(base, { sessionToken: token });
}

type Write = { success: boolean; message: string; version: number };

export function saveDraft(token: string, version: number, page: HomePageDocument) {
  return callApi<Write>(`${base}/draft`, { method: "PUT", body: { version, page }, sessionToken: token });
}

export function discardDraft(token: string, version: number) {
  return callApi<Write>(`${base}/draft/discard`, { method: "POST", body: { version }, sessionToken: token });
}

export function publish(token: string, version: number) {
  return callApi<Write>(`${base}/publish`, { method: "POST", body: { version }, sessionToken: token });
}

export function preview(token: string) {
  return callApi<HomePage>(`${base}/preview`, { sessionToken: token });
}

export function history(token: string, page: number) {
  return callApi<Page<HomeHistoryItem>>(`${base}/history?page=${page}&size=20`, { sessionToken: token });
}

export function historyVersion(token: string, version: number) {
  return callApi<HomePage>(`${base}/history/${version}`, { sessionToken: token });
}

export function restore(token: string, version: number, fromVersion: number) {
  return callApi<Write>(`${base}/restore`, { method: "POST", body: { version, fromVersion }, sessionToken: token });
}

/** Multipart: "purpose" and "image". Answers with the new picture's id. */
export function uploadImage(token: string, purpose: PageImagePurpose, image: File) {
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("image", image, image.name || "home-image");
  return callApi<{ success: boolean; message: string; id: string }>(`${base}/images`, { method: "POST", body: form, sessionToken: token });
}

// ---- search ----

export type SearchResult = { query: string; products: Page<ProductCard>; categories: Category[] };

/**
 * suggest = type-ahead (not counted in trending or the admin's report). Never
 * cached, so it goes with the shopper's headers (the backend's per-IP limits).
 */
export function search(q: string, page: number, size: number, suggest: boolean) {
  const query = new URLSearchParams({ q, page: String(page), size: String(size) });
  if (suggest) query.set("suggest", "true");
  return callApi<SearchResult>(`/search?${query}`);
}

export type SearchTermStat = { term: string; searches: number; zeroResultSearches: number; hidden: boolean; hiddenTermId: number | null };
export type HiddenTerm = { hiddenTermId: number; term: string; createdAt: string };

export function searchTerms(token: string, days: 7 | 30) {
  return callApi<SearchTermStat[]>(`/admin/search/terms?days=${days}`, { sessionToken: token });
}

export function hiddenTerms(token: string) {
  return callApi<HiddenTerm[]>("/admin/search/hidden-terms", { sessionToken: token });
}

export function hideTerm(token: string, term: string) {
  return callApi<{ success: boolean; message: string; id: number }>("/admin/search/hidden-terms", { method: "POST", body: { term }, sessionToken: token });
}

export function unhideTerm(token: string, hiddenTermId: number) {
  return callApi<{ success: boolean; message: string }>(`/admin/search/hidden-terms/${hiddenTermId}`, { method: "DELETE", sessionToken: token });
}

// ---- buy again ----

export function buyAgain(token: string, limit: number) {
  return callApi<ProductCard[]>(`/users/me/buy-again?limit=${limit}`, { sessionToken: token });
}
