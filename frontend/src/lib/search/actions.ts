"use server";

import { updateTag } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import { HOME_PAGE_TAG } from "@/lib/catalog/data";
import * as api from "@/lib/home-page/service";
import type { HiddenTerm, SearchTermStat } from "@/lib/home-page/service";
import { cleanQuery } from "./query";

// The admin's search report. (The shopper's type-ahead calls the API straight from the browser: lib/search/client.ts.)

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
