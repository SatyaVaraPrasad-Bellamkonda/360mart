"use server";

import { updateTag } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import { getShopCategories, HOME_PAGE_TAG } from "@/lib/catalog/data";
import type { Category } from "@/lib/catalog/types";
import { categoryHref } from "@/lib/catalog/validation";
import * as api from "@/lib/home-page/service";
import type { HiddenTerm, SearchResult, SearchTermStat } from "@/lib/home-page/service";
import { cleanQuery, SUGGEST_SIZE } from "./query";

// Shopper search (the type-ahead) and the admin's search report.

export type Suggestions = Pick<SearchResult, "products"> & { categories: (Category & { href: string; parentName: string | null })[] };

/** Type-ahead suggestions while typing: a few products and categories (with their links). Not counted as a search. */
export async function suggestAction(q: string): Promise<ActionResult<Suggestions>> {
  const text = cleanQuery(q);
  if (!text) return { ok: true, data: { products: { items: [], page: 0, size: SUGGEST_SIZE, totalItems: 0, totalPages: 0 }, categories: [] } };
  const [res, parents] = await Promise.all([api.search(text, 0, SUGGEST_SIZE, true), getShopCategories()]);
  if (!res.ok) return fail({ code: res.error.code, message: res.error.message, fieldErrors: {} });
  const top = parents.ok ? parents.data : [];
  return { ok: true, data: { products: res.data.products, categories: res.data.categories.map((c) => ({ ...c, href: categoryHref(c, top), parentName: top.find((t) => t.categoryId === c.parentCategoryId)?.name ?? null })) } };
}

export async function searchTermsAction(days: 7 | 30): Promise<ActionResult<SearchTermStat[]>> {
  if (days !== 7 && days !== 30) return fail(unexpected());
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.searchTerms(token, days);
  return res.ok ? { ok: true, data: res.data } : fail(await toError(res.error));
}

export async function hiddenTermsAction(): Promise<ActionResult<HiddenTerm[]>> {
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.hiddenTerms(token);
  return res.ok ? { ok: true, data: res.data } : fail(await toError(res.error));
}

/** Keep a term out of trending searches; the home page shows the change at once. */
export async function hideTermAction(term: string): Promise<ActionResult<{ id: number }>> {
  const text = cleanQuery(term);
  if (!text) return fail(error("VALIDATION_FAILED", "Enter the search term to hide."));
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.hideTerm(token, text);
  if (!res.ok) return fail(await toError(res.error));
  updateTag(HOME_PAGE_TAG);
  return { ok: true, data: { id: res.data.id } };
}

export async function unhideTermAction(hiddenTermId: number): Promise<ActionResult<null>> {
  if (!Number.isInteger(hiddenTermId) || hiddenTermId < 1) return fail(unexpected());
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.unhideTerm(token, hiddenTermId);
  if (!res.ok) return fail(await toError(res.error));
  updateTag(HOME_PAGE_TAG);
  return { ok: true, data: null };
}

async function adminToken(): Promise<string | ActionError> {
  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return error("UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "admin") return error("FORBIDDEN", "Only admins can see the search report.");
  return token;
}

async function toError(failure: { code: string; message: string; fieldErrors: Record<string, string> }): Promise<ActionError> {
  if (failure.code === "UNAUTHENTICATED") await clearSession();
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
