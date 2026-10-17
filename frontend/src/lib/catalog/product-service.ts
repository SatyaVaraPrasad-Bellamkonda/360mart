import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Product, ProductInput, ProductVariant, VariantInput } from "./types";

// One function per product / size endpoint. The shop list is public (no
// session); everything under /admin needs an admin session, and the backend
// checks the role on every call (403 FORBIDDEN).

// The shop list is cached (lib/catalog/data.ts), so it's sent without the visitor's headers.
const NO_VISITOR = { incoming: new Headers() };

/** Active products of a subcategory, each with its active sizes. */
export function listProducts(subcategoryId: number) {
  return callApi<Product[]>(`/categories/${subcategoryId}/products`, NO_VISITOR);
}

export function createProduct(token: string, input: ProductInput, image: File | null) {
  return callApi<Product>("/admin/products", { method: "POST", body: multipart(input, image), sessionToken: token });
}

export function updateProduct(token: string, productId: number, input: ProductInput, image: File | null) {
  return callApi<Product>(`/admin/products/${productId}`, { method: "PUT", body: multipart(input, image), sessionToken: token });
}

/** Every size of a product, hidden ones too. */
export function listVariants(token: string, productId: number) {
  return callApi<ProductVariant[]>(`/admin/products/${productId}/variants`, { sessionToken: token });
}

export function createVariant(token: string, productId: number, input: VariantInput) {
  return callApi<ProductVariant>(`/admin/products/${productId}/variants`, { method: "POST", body: input, sessionToken: token });
}

export function updateVariant(token: string, productId: number, variantId: number, input: VariantInput) {
  return callApi<ProductVariant>(`/admin/products/${productId}/variants/${variantId}`, { method: "PUT", body: input, sessionToken: token });
}

// Two parts: "product" (JSON with its own content type, or the server answers
// 415) and an optional "image". No image part on update = keep the current picture.
function multipart(input: ProductInput, image: File | null): FormData {
  const form = new FormData();
  form.append("product", new Blob([JSON.stringify(input)], { type: "application/json" }), "product.json");
  if (image) form.append("image", image, image.name || "product-image");
  return form;
}
