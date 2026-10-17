import "server-only";
import { toPlace, type PickerStart } from "@/components/admin/picker-place";
import type { ApiFailure } from "@/lib/backend/client";
import { loadSubcategories, loadTopCategories } from "@/lib/catalog/data";
import type { Category } from "@/lib/catalog/types";
import { parseCategoryId } from "@/lib/catalog/validation";

export type PickerLoad =
  | { ok: true; start: PickerStart; category: Category | null; subcategory: Category | null }
  | { ok: false; error: ApiFailure };

/**
 * What the category → subcategory picker starts with, from ?category= and ?sub=:
 * the categories (one call) and, only when a category is named, its
 * subcategories (one more). Never every category's subcategories.
 */
export async function loadPicker(categoryParam: unknown, subParam: unknown): Promise<PickerLoad> {
  const top = await loadTopCategories();
  if (!top.ok) return top;
  const category = top.data.find((c) => c.categoryId === parseCategoryId(categoryParam)) ?? null;
  const subs = category ? await loadSubcategories(category.categoryId) : { ok: true as const, data: [] };
  if (!subs.ok) return subs;
  const subcategory = subs.data.find((c) => c.categoryId === parseCategoryId(subParam)) ?? null;
  return {
    ok: true,
    start: { categories: top.data.map(toPlace), categoryId: category?.categoryId ?? 0, subcategories: subs.data.map(toPlace) },
    category,
    subcategory,
  };
}
