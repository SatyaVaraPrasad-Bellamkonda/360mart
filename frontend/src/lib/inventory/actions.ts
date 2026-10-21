"use server";

import { revalidatePath } from "next/cache";
import type { ActionError, ActionResult } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/dal";
import { clearSession, getSessionToken } from "@/lib/auth/session";
import type { ApiFailure, ApiResult } from "@/lib/backend/client";
import { getShopSubcategories } from "@/lib/catalog/data";
import type { Category } from "@/lib/catalog/types";
import * as api from "./inventory-service";
import type { Batch, Listing, Page, PriceChange, StockMovement } from "./types";
import { batchErrors, isUuidLike, listingErrors, readBatchDraft, readListingDraft, readStockDraft, stockErrors, toBatchInput, toListingInput, toStockInput } from "./validation";

// Seller products & stock actions. Same pattern as the store actions: check
// everything again here (browser input can be forged), make the write, then
// read the listing once and return it, so the screen refreshes from the answer
// (two backend calls per save). Tab contents load on demand, one call each.

const PAGE_SIZE = 20;

// Backend codes that belong to one field of the listing form.
const LISTING_FIELD_OF: Record<string, string> = { STORE_SKU_TAKEN: "storeSku" };

/** API 2: start selling a size. Returns the new listing's id (the screen then opens it). */
export async function createListingAction(variantId: unknown, input: unknown): Promise<ActionResult<{ listingId: string; message: string }>> {
  if (typeof variantId !== "number" || !Number.isSafeInteger(variantId) || variantId <= 0) return fail(unexpected());
  const draft = readListingDraft(input);
  if (!draft) return fail(unexpected());
  const problems = listingErrors(draft, true);
  if (Object.keys(problems).length) return fail(invalid(problems));
  const token = await sellerToken();
  if (typeof token !== "string") return fail(token);
  const res = await api.createListing(token, toListingInput(draft, { variantId }));
  if (!res.ok) return fail(await toError(res.error, LISTING_FIELD_OF));
  revalidatePath("/seller/products", "layout");
  return { ok: true, data: { listingId: res.data.id ?? "", message: res.data.message } };
}

/** API 5: price, MRP and settings (every field; stock isn't changed here). */
export async function updateListingAction(listingId: unknown, input: unknown): Promise<ActionResult<{ listing: Listing; message: string }>> {
  if (!isUuidLike(listingId)) return fail(notFound());
  const draft = readListingDraft(input);
  if (!draft) return fail(unexpected());
  const problems = listingErrors(draft, false);
  if (Object.keys(problems).length) return fail(invalid(problems));
  return writeThenRead(listingId, (token) => api.updateListing(token, listingId, toListingInput(draft)), LISTING_FIELD_OF);
}

/** API 7: add stock, damaged, customer return, correct count. */
export async function adjustStockAction(listingId: unknown, input: unknown, ctx: unknown): Promise<ActionResult<{ listing: Listing; message: string }>> {
  if (!isUuidLike(listingId)) return fail(notFound());
  const draft = readStockDraft(input);
  const c = ctx && typeof ctx === "object" ? (ctx as Record<string, unknown>) : {};
  if (!draft) return fail(unexpected());
  const tracksBatches = c.tracksBatches === true;
  if (tracksBatches && draft.batchId && !isUuidLike(draft.batchId)) return fail(unexpected());
  // The stock check here is only a hint (the backend has the real number), so a large stock is assumed.
  const problems = stockErrors(draft, { tracksBatches, stock: Number.MAX_SAFE_INTEGER });
  if (Object.keys(problems).length) return fail(invalid(problems));
  return writeThenRead(listingId, (token) => api.adjustStock(token, listingId, toStockInput(draft, tracksBatches)), { INSUFFICIENT_STOCK: "quantity", BATCH_LIMIT_EXCEEDED: "quantity", BATCH_NOT_FOUND: "batchId" });
}

/** API 8: a delivery with an expiry date (batch-tracked items). */
export async function addBatchAction(listingId: unknown, input: unknown): Promise<ActionResult<{ listing: Listing; message: string }>> {
  if (!isUuidLike(listingId)) return fail(notFound());
  const draft = readBatchDraft(input);
  if (!draft) return fail(unexpected());
  const problems = batchErrors(draft);
  if (Object.keys(problems).length) return fail(invalid(problems));
  return writeThenRead(listingId, (token) => api.addBatch(token, listingId, toBatchInput(draft)), { INVALID_EXPIRY_DATE: "expiresOn" });
}

// ---- tabs and pickers (reads, on demand) ----

export async function loadMovementsAction(listingId: unknown, page: unknown): Promise<ActionResult<Page<StockMovement>>> {
  return read(listingId, (token, id) => api.stockMovements(token, id, { page: pageNumber(page), size: PAGE_SIZE }));
}

export async function loadPriceHistoryAction(listingId: unknown, page: unknown): Promise<ActionResult<Page<PriceChange>>> {
  return read(listingId, (token, id) => api.priceHistory(token, id, { page: pageNumber(page), size: PAGE_SIZE }));
}

export async function loadBatchesAction(listingId: unknown, includeEmpty: unknown): Promise<ActionResult<Batch[]>> {
  return read(listingId, (token, id) => api.listBatches(token, id, includeEmpty === true));
}

/** Subcategories of one category for the "Add products" filter (public data, any shopkeeper). */
export async function loadCatalogSubcategoriesAction(categoryId: unknown): Promise<ActionResult<Category[]>> {
  if (typeof categoryId !== "number" || !Number.isSafeInteger(categoryId) || categoryId <= 0) return fail(unexpected());
  const token = await sellerToken();
  if (typeof token !== "string") return fail(token);
  // From the shop's cache (shared with the category pages), so usually no backend call at all.
  const res = await getShopSubcategories(categoryId);
  return res.ok ? { ok: true, data: res.data } : fail(await toError(res.error));
}

// ---- shared ----

async function writeThenRead(
  listingId: string,
  write: (token: string) => Promise<ApiResult<{ message: string }>>,
  fieldOf: Record<string, string>,
): Promise<ActionResult<{ listing: Listing; message: string }>> {
  const token = await sellerToken();
  if (typeof token !== "string") return fail(token);
  const res = await write(token);
  if (!res.ok) return fail(await toError(res.error, fieldOf));
  // The list page is a different page: mark it changed (not this one, which reads below).
  revalidatePath("/seller/products");
  const fresh = await api.getListing(token, listingId);
  if (!fresh.ok) return fail(error("RELOAD_FAILED", `${res.data.message} Reload the page to see the change.`));
  return { ok: true, data: { listing: fresh.data, message: res.data.message } };
}

async function read<T>(listingId: unknown, call: (token: string, id: string) => Promise<ApiResult<T>>): Promise<ActionResult<T>> {
  if (!isUuidLike(listingId)) return fail(notFound());
  const token = await sellerToken();
  if (typeof token !== "string") return fail(token);
  const res = await call(token, listingId);
  return res.ok ? { ok: true, data: res.data } : fail(await toError(res.error));
}

async function sellerToken(): Promise<string | ActionError> {
  const token = await getSessionToken();
  const user = token ? await getCurrentUser() : null;
  if (!token || !user) return error("UNAUTHENTICATED", "Please login to continue.");
  if (user.role !== "seller") return error("FORBIDDEN", "Only shopkeeper accounts can manage products.");
  return token;
}

async function toError(failure: ApiFailure, fieldOf: Record<string, string> = {}): Promise<ActionError> {
  if (failure.code === "UNAUTHENTICATED") await clearSession();
  const field = fieldOf[failure.code];
  if (field) return { code: failure.code, message: failure.message, fieldErrors: { [field]: failure.message } };
  return { code: failure.code, message: failure.message, fieldErrors: failure.fieldErrors };
}

function pageNumber(page: unknown): number {
  return typeof page === "number" && Number.isInteger(page) && page >= 0 && page <= 10_000 ? page : 0;
}

function invalid(fieldErrors: Record<string, string | undefined>): ActionError {
  const clean = Object.fromEntries(Object.entries(fieldErrors).filter(([, v]) => v)) as Record<string, string>;
  return { code: "VALIDATION_FAILED", message: Object.values(clean)[0] ?? "Please fix the highlighted fields.", fieldErrors: clean };
}

function notFound() {
  return error("LISTING_NOT_FOUND", "This product isn't in your store. Reload the page.");
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
