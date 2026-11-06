import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Category } from "@/lib/catalog/types";
import type { ProductCard } from "@/lib/category-page/types";
import type { Page } from "@/lib/inventory/types";
import type { AdminHomePage, HomePage } from "./types";

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

export function preview(token: string) {
  return callApi<HomePage>(`${base}/preview`, { sessionToken: token });
}

export function historyVersion(token: string, version: number) {
  return callApi<HomePage>(`${base}/history/${version}`, { sessionToken: token });
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

// ---- buy again ----

export function buyAgain(token: string, limit: number) {
  return callApi<ProductCard[]>(`/users/me/buy-again?limit=${limit}`, { sessionToken: token });
}
