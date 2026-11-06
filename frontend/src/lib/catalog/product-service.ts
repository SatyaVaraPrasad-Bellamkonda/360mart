import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Page } from "@/lib/inventory/types";
import type { Product, ProductVariant } from "./types";

// The server's product reads: the shop list (public, no session) and a
// product's sizes for the admin page (admin session; the backend checks the
// role). The admin's writes go straight from the browser: lib/catalog/admin-client.ts.

// The shop list is cached (lib/catalog/data.ts), so it's sent without the visitor's headers.
const NO_VISITOR = { incoming: new Headers() };

/** One page of a subcategory's active products, each with its active sizes (page from 0, size up to 100). */
export function listProducts(subcategoryId: number, page = 0, size = 24) {
  return callApi<Page<Product>>(`/categories/${subcategoryId}/products?page=${page}&size=${size}`, NO_VISITOR);
}

/** Every size of a product, hidden ones too. */
export function listVariants(token: string, productId: number) {
  return callApi<ProductVariant[]>(`/admin/products/${productId}/variants`, { sessionToken: token });
}
