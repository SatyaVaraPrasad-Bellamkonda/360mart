// Shared by the category → subcategory picker (client) and the pages that
// prepare its data (server). No React here, so both sides can import it.

export type PickerPlace = { categoryId: number; name: string; slug: string; imageUrl: string | null };

/** What the picker shows first: every category, and the chosen one's subcategories (when one is chosen). */
export type PickerStart = { categories: PickerPlace[]; categoryId: number; subcategories: PickerPlace[] };

export const toPlace = ({ categoryId, name, slug, imageUrl }: PickerPlace): PickerPlace => ({ categoryId, name, slug, imageUrl });

/** Products page link that opens one subcategory (category too, so nothing has to be looked up). */
export function productsUrl(categoryId: number, subcategoryId: number): string {
  return `/admin/products?category=${categoryId}&sub=${subcategoryId}`;
}
