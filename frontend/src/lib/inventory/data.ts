import "server-only";
import { redirect } from "next/navigation";
import { getSessionToken } from "@/lib/auth/session";
import type { ApiFailure } from "@/lib/backend/client";
import * as api from "./inventory-service";
import type { CatalogProduct, Listing, ListingTab, Page, StockMovement } from "./types";
import { isUuidLike } from "./validation";

// Seller products & stock data for pages (server components), one backend call
// each. Call after requireRole("seller"). An ended session goes to login and
// comes back; no store yet goes to registration; any other failure is returned
// so the page can show a message.

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export const PAGE_SIZE = 20;

/** Page numbers from the URL (?page=2 is the second page; the API counts from 0). */
export function pageFromParam(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n - 1 : 0;
}

export async function loadListings(tab: ListingTab, q: string, page: number, returnTo: string): Promise<Loaded<Page<Listing>>> {
  const token = await tokenOrLogin(returnTo);
  const res = await api.listListings(token, { q: q || undefined, lowStock: tab === "low" ? true : undefined, available: tab === "hidden" ? false : undefined, page, size: PAGE_SIZE });
  return res.ok ? { ok: true, data: res.data } : failed(res.error, returnTo);
}

export async function loadCatalog(q: string, categoryId: number | undefined, page: number, returnTo: string): Promise<Loaded<Page<CatalogProduct>>> {
  const token = await tokenOrLogin(returnTo);
  const res = await api.browseCatalog(token, { q: q || undefined, categoryId, page, size: PAGE_SIZE });
  return res.ok ? { ok: true, data: res.data } : failed(res.error, returnTo);
}

/** The listing and the first page of its stock history (two calls, side by side); null = not this store's. */
export async function loadListingDetail(listingId: string, returnTo: string): Promise<Loaded<{ listing: Listing; movements: Page<StockMovement> } | null>> {
  if (!isUuidLike(listingId)) return { ok: true, data: null };
  const token = await tokenOrLogin(returnTo);
  const [listing, movements] = await Promise.all([api.getListing(token, listingId), api.stockMovements(token, listingId, { page: 0, size: PAGE_SIZE })]);
  if (!listing.ok && listing.error.code === "LISTING_NOT_FOUND") return { ok: true, data: null };
  if (!listing.ok) return failed(listing.error, returnTo);
  const emptyPage: Page<StockMovement> = { items: [], page: 0, size: PAGE_SIZE, totalItems: 0, totalPages: 0 };
  return { ok: true, data: { listing: listing.data, movements: movements.ok ? movements.data : emptyPage } };
}

async function tokenOrLogin(returnTo: string): Promise<string> {
  const token = await getSessionToken();
  if (!token) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return token;
}

function failed(error: ApiFailure, returnTo: string): Loaded<never> {
  if (error.code === "UNAUTHENTICATED") redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  // Products belong to a store: none yet → start the registration.
  if (error.code === "STORE_NOT_FOUND") redirect("/seller/store");
  return { ok: false, error };
}
