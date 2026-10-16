// Category shapes, as the backend's /categories and /admin/categories APIs
// send and receive them (CategoryResponse.java / CategoryRequest.java).
// Safe for client components (no data, no secrets).

/** Ids are numbers. parentCategoryId null = a top-level category (Fruits); set = a subcategory (Mangoes). */
export type Category = {
  categoryId: number;
  parentCategoryId: number | null;
  name: string;
  slug: string;
  description: string | null;
  /** Signed link, valid about 1 hour: use it in <img> straight away, never store it. Null = no picture. */
  imageUrl: string | null;
  badgeLabel: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** A top-level category with its subcategories (the tree is two levels deep, never more). */
export type CategoryNode = { category: Category; children: Category[] };

/** The JSON part of a create/update. Update replaces the whole category, so every field is always sent. */
export type CategoryInput = {
  parentCategoryId: number | null;
  name: string;
  slug: string | null; // null = the backend makes one from the name
  description: string | null;
  badgeLabel: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
};

/** What the admin form edits: text inputs hold strings. */
export type CategoryDraft = {
  parentCategoryId: number | null;
  name: string;
  slug: string;
  description: string;
  badgeLabel: string;
  seoTitle: string;
  seoDescription: string;
  displayOrder: string;
  isFeatured: boolean;
  isActive: boolean;
};

export type CategoryField = keyof CategoryDraft | "image";
export type CategoryErrors = Partial<Record<CategoryField, string>>;
