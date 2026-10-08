import type { Product } from "./types";

export function productPath(p: Pick<Product, "category" | "subcategory" | "slug">): string {
  return `/${p.category}/${p.subcategory}/${p.slug}`;
}
