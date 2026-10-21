import "server-only";
import { callApi } from "@/lib/backend/client";
import type { ActionResponse } from "@/lib/stores/store-service";
import type { Batch, BatchInput, CatalogProduct, Listing, ListingInput, Page, PriceChange, StockAdjustmentInput, StockMovement } from "./types";

// One function per seller products & stock endpoint. Always the signed-in
// owner's own store (no store id is sent). Writes return a short confirmation;
// screens refresh with the matching GET.

export type PageQuery = { page?: number; size?: number };

function query(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** 1. The catalogue to pick from (active products only), with this store's listing per size. */
export function browseCatalog(token: string, p: { q?: string; categoryId?: number } & PageQuery) {
  return callApi<Page<CatalogProduct>>(`/seller/catalog${query(p)}`, { sessionToken: token });
}

/** 2. Start selling one size. */
export function createListing(token: string, input: ListingInput) {
  return callApi<ActionResponse>("/seller/store/products", { method: "POST", body: input, sessionToken: token });
}

/** 3. The store's products. */
export function listListings(token: string, p: { q?: string; available?: boolean; lowStock?: boolean } & PageQuery) {
  return callApi<Page<Listing>>(`/seller/store/products${query(p)}`, { sessionToken: token });
}

/** 4. */
export function getListing(token: string, listingId: string) {
  return callApi<Listing>(`/seller/store/products/${listingId}`, { sessionToken: token });
}

/** 5. Replaces every field (stock isn't changed here). */
export function updateListing(token: string, listingId: string, input: ListingInput) {
  return callApi<ActionResponse>(`/seller/store/products/${listingId}`, { method: "PUT", body: input, sessionToken: token });
}

/** 6. Newest first. */
export function priceHistory(token: string, listingId: string, p: PageQuery) {
  return callApi<Page<PriceChange>>(`/seller/store/products/${listingId}/price-history${query(p)}`, { sessionToken: token });
}

/** 7. */
export function adjustStock(token: string, listingId: string, input: StockAdjustmentInput) {
  return callApi<ActionResponse>(`/seller/store/products/${listingId}/stock-adjustments`, { method: "POST", body: input, sessionToken: token });
}

/** 8. */
export function addBatch(token: string, listingId: string, input: BatchInput) {
  return callApi<ActionResponse>(`/seller/store/products/${listingId}/batches`, { method: "POST", body: input, sessionToken: token });
}

/** 9. Earliest expiry first; not paged. */
export function listBatches(token: string, listingId: string, includeEmpty: boolean) {
  return callApi<Batch[]>(`/seller/store/products/${listingId}/batches${query({ includeEmpty })}`, { sessionToken: token });
}

/** 10. Newest first. */
export function stockMovements(token: string, listingId: string, p: PageQuery) {
  return callApi<Page<StockMovement>>(`/seller/store/products/${listingId}/movements${query(p)}`, { sessionToken: token });
}
