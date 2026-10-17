// Our own photos for categories whose slug we already designed for. Used when
// the admin hasn't uploaded a picture yet, so the home page and header still look
// finished. Categories themselves (names, order, badges) come only from the
// backend (lib/catalog). Safe for client components.

export const LOCAL_CATEGORY_PHOTOS: Record<string, string> = {
  fruits: "/images/categories/fruits.jpg",
  meat: "/images/categories/meat-fish.jpg",
  "meat-fish": "/images/categories/meat-fish.jpg",
  groceries: "/images/categories/groceries.jpg",
  fashion: "/images/categories/fashion.jpg",
};

/** The picture to show: the uploaded one, else our photo for that slug, else null (placeholder). */
export function categoryPicture(category: { slug: string; imageUrl: string | null }): string | null {
  return category.imageUrl ?? LOCAL_CATEGORY_PHOTOS[category.slug] ?? null;
}
