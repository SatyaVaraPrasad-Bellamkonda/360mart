import { api, type ApiResult } from "@/lib/api-client";
import type { ProductCard } from "@/lib/category-page/types";

// "Buy again" for the signed-in shopper: GET /users/me/buy-again, called from
// the browser (per shopper, never cached). Each card carries what the shopper
// last bought: that size from that store, with today's price and whether it
// can be added now.

export type LastBought = {
  variantId: number;
  variantLabel: string;
  listingId: string;
  storeId: string;
  storeName: string;
  /** Today's price and MRP (never the old order price). */
  price: number;
  mrp: number;
  /** On sale, in stock, store live and accepting orders. */
  available: boolean;
  /** 0 when not available. */
  maxOrderQuantity: number;
  /** null when no location was sent. */
  deliversHere: boolean | null;
  lastOrderedAt: string;
};

/** null lastBought = that store closed down or the size was retired: "See stores". */
export type BuyAgainItem = ProductCard & { lastBought: LastBought | null };

/** What a card can offer, checked in the backend's order. */
export type BuyAgainState = "see-stores" | "out-of-stock" | "not-here" | "add";

export function stateOf(item: BuyAgainItem): BuyAgainState {
  const b = item.lastBought;
  if (!b) return "see-stores";
  if (!b.available || b.maxOrderQuantity < 1) return "out-of-stock";
  if (b.deliversHere === false) return "not-here";
  return "add"; // deliversHere null (no point chosen) = unknown: the cart checks delivery anyway
}

/**
 * The shopper's cards, with the "Deliver to" point when there is one (both
 * coordinates or neither). A point the backend refuses (400) is dropped and
 * asked again without it, once.
 */
export async function loadBuyAgain(limit: number, point: { latitude: number; longitude: number } | null): Promise<ApiResult<BuyAgainItem[]>> {
  const n = Number.isInteger(limit) ? Math.min(20, Math.max(4, limit)) : 12;
  const at = point ? `&latitude=${point.latitude.toFixed(6)}&longitude=${point.longitude.toFixed(6)}` : "";
  const res = await api<BuyAgainItem[]>(`/users/me/buy-again?limit=${n}${at}`);
  if (!res.ok && point && res.error.status === 400) return loadBuyAgain(limit, null);
  if (res.ok && !Array.isArray(res.data)) return { ok: true, data: [] };
  return res;
}

export const productHref = (p: Pick<ProductCard, "categorySlug" | "subcategorySlug" | "slug">) => `/${p.categorySlug}/${p.subcategorySlug}/${p.slug}`;
