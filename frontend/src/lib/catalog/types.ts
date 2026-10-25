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
  /** The page colours (a subcategory always has its parent's). */
  theme: PageTheme;
  /** The page's own colour ("#0e7490"), overriding theme; a subcategory has its parent's. */
  customColour?: string | null;
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

// ---- Products and their sizes (MasterProductResponse.java / MasterProductRequest.java) ----

/** The veg / non-veg mark of Indian food labels. null = not a food item. */
export type FoodType = "VEG" | "NON_VEG" | "EGG";
/**
 * Colour preset of a category page (set in the page editor). The backend sends
 * colour names; the old food-type names (VEG = green, NON_VEG = red, EGG = amber,
 * GENERAL = indigo) are still read, in case an old cached copy has them.
 */
export type PageTheme = "VEG" | "NON_VEG" | "EGG" | "GENERAL" | "GREEN" | "RED" | "AMBER" | "ORANGE" | "PINK" | "PURPLE" | "INDIGO" | "BLUE" | "TEAL" | "SLATE";
export type ProductUnit = "KG" | "GRAM" | "MILLIGRAM" | "LITRE" | "MILLILITRE" | "DOZEN" | "PIECE" | "PACK" | "BUNCH";

/** One size a product is sold in ("1 kg"). Prices come later, per store. */
export type ProductVariant = {
  variantId: number;
  label: string;
  /** A number: 1.5 arrives as 1.5. Use it (with unit) for maths, show label to people. */
  quantity: number;
  unit: ProductUnit;
  sku: string | null;
  displayOrder: number;
  isActive: boolean;
};

/** A master product. It always sits in a subcategory (categoryId). */
export type Product = {
  productId: number;
  categoryId: number;
  name: string;
  slug: string;
  brand: string | null;
  shortDescription: string | null;
  description: string | null;
  foodType: FoodType | null;
  origin: string | null;
  bestSeason: string | null;
  storageTip: string | null;
  /** How long it keeps, one line per storage condition ("Refrigerated: 2 to 3 days"); null = not given. */
  shelfLife: string | null;
  isInSeason: boolean;
  /** Signed link, valid about 1 hour (like category pictures). */
  imageUrl: string | null;
  badgeLabel: string | null;
  hsnCode: string | null;
  /** 5.00 may arrive as 5 or 5.0. */
  gstRate: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
};

/** The JSON part of a product create/update. Update replaces the whole product, so every field is sent. */
export type ProductInput = {
  categoryId: number;
  name: string;
  slug: string | null;
  brand: string | null;
  shortDescription: string | null;
  description: string | null;
  foodType: FoodType | null;
  origin: string | null;
  bestSeason: string | null;
  storageTip: string | null;
  /** How long it keeps, one line per storage condition ("Refrigerated: 2 to 3 days"); null = not given. */
  shelfLife: string | null;
  isInSeason: boolean;
  badgeLabel: string | null;
  hsnCode: string | null;
  gstRate: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
};

/** What the product form edits: text inputs hold strings. categoryId 0 = not chosen yet. */
export type ProductDraft = {
  categoryId: number;
  name: string;
  slug: string;
  brand: string;
  shortDescription: string;
  description: string;
  foodType: FoodType | "";
  origin: string;
  bestSeason: string;
  storageTip: string;
  shelfLife: string;
  isInSeason: boolean;
  badgeLabel: string;
  hsnCode: string;
  gstRate: string;
  seoTitle: string;
  seoDescription: string;
  displayOrder: string;
  isFeatured: boolean;
  isActive: boolean;
};

export type ProductField = keyof ProductDraft | "image";
export type ProductErrors = Partial<Record<ProductField, string>>;

/** The JSON body of a size create/update (plain JSON, no multipart). */
export type VariantInput = { label: string; quantity: number; unit: ProductUnit; sku: string | null; displayOrder: number; isActive: boolean };
export type VariantDraft = { label: string; quantity: string; unit: ProductUnit; sku: string; displayOrder: string; isActive: boolean };
export type VariantErrors = Partial<Record<keyof VariantDraft, string>>;
