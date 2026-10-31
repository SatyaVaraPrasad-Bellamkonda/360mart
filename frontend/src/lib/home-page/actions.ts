"use server";

import { updateTag } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import type { ApiFailure } from "@/lib/backend/client";
import { HOME_PAGE_TAG } from "@/lib/catalog/data";
import { categoryImageError } from "@/lib/catalog/validation";
import type { PageImagePurpose, ProductCard } from "@/lib/category-page/types";
import type { Page } from "@/lib/inventory/types";
import * as api from "./service";
import type { AdminHomePage, HomeHistoryItem } from "./types";
import { cleanHomeDocument, homeErrors, readHomeDocument } from "./validation";

// Home page actions: the admin designer (checked here, and again by the
// backend), the product picker's search, and the shopper's "Buy again" row.

type Written = ActionResult<{ version: number; message: string }>;

export async function loadHomeAdminAction(): Promise<ActionResult<AdminHomePage>> {
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  return result(await api.getAdminPage(token));
}

/** Save the whole draft. Field problems come back keyed by the backend's paths ("timeSlots[1].start"). */
export async function saveHomeDraftAction(version: number, input: unknown): Promise<Written> {
  const doc = readHomeDocument(input);
  if (!doc || !Number.isInteger(version) || version < 0) return fail(unexpected());
  const clean = cleanHomeDocument(doc);
  const problems = homeErrors(clean);
  if (Object.keys(problems).length) return fail({ code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", fieldErrors: problems });
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  return write(await api.saveDraft(token, version, clean));
}

/** Publish the saved draft; the shop shows it at once (the cached home page is dropped). */
export async function publishHomeAction(version: number): Promise<Written> {
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await write(await api.publish(token, version));
  if (res.ok) updateTag(HOME_PAGE_TAG);
  return res;
}

export async function discardHomeDraftAction(version: number): Promise<Written> {
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  return write(await api.discardDraft(token, version));
}

export async function homeHistoryAction(page: number): Promise<ActionResult<Page<HomeHistoryItem>>> {
  if (!Number.isInteger(page) || page < 0) return fail(unexpected());
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  return result(await api.history(token, page));
}

/** Copy a published version into the draft (publish to make it live). */
export async function restoreHomeAction(version: number, fromVersion: number): Promise<Written> {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) return fail(unexpected());
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  return write(await api.restore(token, version, fromVersion));
}

const PURPOSES: PageImagePurpose[] = ["HERO", "HERO_MOBILE", "BANNER", "GUIDE", "OG"];

/** Upload a home page picture (JPEG/PNG, ≤ 2 MB); answers with its id. */
export async function uploadHomeImageAction(form: FormData): Promise<ActionResult<{ imageId: string }>> {
  if (!(form instanceof FormData)) return fail(unexpected());
  const purpose = form.get("purpose");
  const image = form.get("image");
  if (!PURPOSES.includes(purpose as PageImagePurpose) || !(image instanceof File) || image.size === 0) return fail(unexpected());
  const problem = categoryImageError(image);
  if (problem) return fail({ code: "INVALID_IMAGE", message: problem, fieldErrors: {} });
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.uploadImage(token, purpose as PageImagePurpose, image);
  if (!res.ok) {
    if (res.error.status === 413) return fail({ code: "IMAGE_TOO_LARGE", message: "The image must be at most 2 MB.", fieldErrors: {} });
    if (res.error.status === 502 || res.error.code === "STORAGE_UNAVAILABLE") return fail(error(res.error.code, "Picture storage is busy right now. Please try again in a minute."));
    return fail(await toError(res.error));
  }
  return { ok: true, data: { imageId: res.data.id } };
}

/** The designer's product picker: products on sale matching the text (a type-ahead call, so not counted as a search). */
export async function pickProductsAction(q: string): Promise<ActionResult<ProductCard[]>> {
  const text = typeof q === "string" ? q.trim().slice(0, 100) : "";
  if (text.length < 2) return { ok: true, data: [] };
  const token = await adminToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.search(text, 0, 12, true);
  return res.ok ? { ok: true, data: res.data.products.items } : fail(await toError(res.error));
}

/** Products from the shopper's delivered orders still on sale ([] = hide the row; also when signed out). */
export async function buyAgainAction(): Promise<ActionResult<ProductCard[]>> {
  const token = await getSessionToken();
  if (!token) return { ok: true, data: [] };
  const res = await api.buyAgain(token, 12);
  if (!res.ok) return res.error.code === "UNAUTHENTICATED" || res.error.status === 403 ? { ok: true, data: [] } : fail({ code: res.error.code, message: res.error.message, fieldErrors: {} });
  return { ok: true, data: res.data };
}

// ---- helpers ----

async function adminToken(): Promise<string | ActionError> {
  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return error("UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "admin") return error("FORBIDDEN", "Only admins can design the home page.");
  return token;
}

async function result<T>(res: { ok: true; data: T } | { ok: false; error: ApiFailure }): Promise<ActionResult<T>> {
  return res.ok ? { ok: true, data: res.data } : fail(await toError(res.error));
}

async function write(res: { ok: true; data: { version: number; message: string } } | { ok: false; error: ApiFailure }): Promise<Written> {
  return res.ok ? { ok: true, data: { version: res.data.version, message: res.data.message } } : fail(await toError(res.error));
}

async function toError(failure: ApiFailure): Promise<ActionError> {
  if (failure.code === "UNAUTHENTICATED") await clearSession();
  if (failure.code === "FORBIDDEN") return error("FORBIDDEN", "Only admins can design the home page.");
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
