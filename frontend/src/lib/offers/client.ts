import { insideIndia } from "@/lib/addresses/validation";
import { api, type ApiResult } from "@/lib/api-client";
import type { ProductStoreOffers } from "./types";

// "Stores that deliver this to me" on the product page, called straight from
// the browser (GET /api/v1/products/{id}/variants/{vid}/stores: visible in
// Network). Public (no login) and never cached: prices, stock and "open now"
// change all the time. The backend checks stock again at checkout.

const PAGE_SIZE = 20;

export async function loadOffers(productId: number, variantId: number, latitude: number, longitude: number, page: number): Promise<ApiResult<ProductStoreOffers>> {
  const id = (v: number) => Number.isSafeInteger(v) && v > 0;
  if (!id(productId) || !id(variantId)) return fail("VARIANT_NOT_FOUND", "This size is no longer available. Please refresh the page.");
  if (!insideIndia({ latitude, longitude })) return fail("VALIDATION_FAILED", "We couldn't use this location. Please choose your location again.");
  const q = new URLSearchParams({ latitude: latitude.toFixed(6), longitude: longitude.toFixed(6), page: String(Math.max(0, Math.min(1000, page))), size: String(PAGE_SIZE) });
  const res = await api<ProductStoreOffers>(`/products/${productId}/variants/${variantId}/stores?${q}`);
  if (res.ok) return res;
  if (res.error.code === "VALIDATION_FAILED") return fail(res.error.code, "We couldn't use this location. Please choose your location again.");
  if (res.error.code === "VARIANT_NOT_FOUND") return fail(res.error.code, "This size is no longer available. Please refresh the page.");
  return res;
}

function fail(code: string, message: string): ApiResult<never> {
  return { ok: false, error: { status: 0, code, message, fieldErrors: {}, issues: [] } };
}
