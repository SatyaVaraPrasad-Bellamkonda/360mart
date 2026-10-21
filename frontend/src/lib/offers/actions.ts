"use server";

import type { ActionResult } from "@/lib/auth/actions";
import { insideIndia } from "@/lib/addresses/validation";
import { callApi } from "@/lib/backend/client";
import type { ProductStoreOffers } from "./types";

// "Stores that deliver this to me" on the product page. Public (no login), and
// never cached: prices, stock and "open now" change all the time, so every
// shopper gets a fresh answer. The backend checks stock again at checkout.

const PAGE_SIZE = 20;

export async function loadOffersAction(productId: unknown, variantId: unknown, latitude: unknown, longitude: unknown, page: unknown): Promise<ActionResult<ProductStoreOffers>> {
  const id = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
  if (!id(productId) || !id(variantId)) return fail("VARIANT_NOT_FOUND", "This size is no longer available. Please refresh the page.");
  if (typeof latitude !== "number" || typeof longitude !== "number" || !insideIndia({ latitude, longitude })) {
    return fail("VALIDATION_FAILED", "We couldn't use this location. Please choose your location again.");
  }
  const p = typeof page === "number" && Number.isInteger(page) && page >= 0 && page <= 1000 ? page : 0;
  const q = new URLSearchParams({ latitude: latitude.toFixed(6), longitude: longitude.toFixed(6), page: String(p), size: String(PAGE_SIZE) });
  const res = await callApi<ProductStoreOffers>(`/products/${productId}/variants/${variantId}/stores?${q}`);
  if (res.ok) return { ok: true, data: res.data };
  if (res.error.code === "VALIDATION_FAILED") return fail(res.error.code, "We couldn't use this location. Please choose your location again.");
  if (res.error.code === "VARIANT_NOT_FOUND") return fail(res.error.code, "This size is no longer available. Please refresh the page.");
  return fail(res.error.code, res.error.message);
}

function fail(code: string, message: string): { ok: false; error: { code: string; message: string; fieldErrors: Record<string, string> } } {
  return { ok: false, error: { code, message, fieldErrors: {} } };
}
