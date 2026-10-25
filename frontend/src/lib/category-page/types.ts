// JSON shapes of the category page APIs: the shop's GET /category-pages/{slug}[/{subSlug}]
// and the admin page editor under /admin/categories/{id}/page. Types and
// constants only, so client components may import them too.

import type { Category, FoodType, PageTheme, Product } from "@/lib/catalog/types";
import type { Page } from "@/lib/inventory/types";

export type { PageTheme };

/** The icons a trust point may use (the backend refuses any other name). */
export const TRUST_ICONS = [
  "store", "scale", "badge-check", "leaf", "sparkles", "truck", "clock", "shield-check", "heart", "star",
  "thumbs-up", "snowflake", "calendar", "map-pin", "package", "tag", "percent", "flame", "droplet", "fish",
  "beef", "drumstick", "egg", "apple", "carrot", "wheat", "milk", "coffee", "shirt", "gift",
] as const;
export type TrustIcon = (typeof TRUST_ICONS)[number];

export type PageStat = "PRODUCTS" | "TYPES" | "IN_SEASON" | "STORES_NEARBY" | "PRICES_FROM";
/** The stats the page can show today (the location ones come later). */
export const PAGE_STATS: { value: PageStat; label: string; topLevelOnly?: boolean }[] = [
  { value: "PRODUCTS", label: "Products" },
  { value: "TYPES", label: "Types", topLevelOnly: true },
  { value: "IN_SEASON", label: "In season" },
];

export type TrustPoint = { icon: TrustIcon; text: string };

// ---- what the admin edits (CategoryPageDocument) ----

export type HeroDoc = {
  headline?: string | null;
  accentLine?: string | null;
  intro?: string | null;
  imageId?: string | null;
  mobileImageId?: string | null;
  imageAlt?: string | null;
  badge?: string | null;
  trustPoints?: TrustPoint[];
  stats?: PageStat[];
};

type SectionBase = { id: string; enabled?: boolean; title?: string | null; subtitle?: string | null };
export type SubcategoriesSection = SectionBase & { type: "SUBCATEGORIES"; layout?: "TILES" | "CHIPS" };
export type ProductRailSection = SectionBase & { type: "PRODUCT_RAIL"; source: "IN_SEASON" | "FEATURED"; limit?: number };
export type ProductGridSection = SectionBase & { type: "PRODUCT_GRID"; showFilters?: boolean };
export type PageSection = SubcategoriesSection | ProductRailSection | ProductGridSection;
export type SectionType = PageSection["type"];

export type PageDocument = {
  schemaVersion: 1;
  theme?: PageTheme;
  /** "#RRGGBB" chosen by the admin; overrides the preset when set (top level only). */
  customColour?: string | null;
  hero: HeroDoc;
  sections: PageSection[];
};

// ---- the shop page (CategoryPageResponse) ----

export type HeroView = {
  headline: string;
  accentLine: string | null;
  intro: string | null;
  imageId: string | null;
  imageUrl: string | null;
  mobileImageId: string | null;
  mobileImageUrl: string | null;
  imageAlt: string;
  badge: string | null;
  trustPoints: TrustPoint[];
  stats: PageStat[];
};

/** A product in a rail (enough for a card and its link). */
export type ProductCard = {
  productId: number;
  name: string;
  slug: string;
  /** Top-level category. */
  categoryId: number;
  categorySlug: string;
  subcategoryId: number;
  subcategorySlug: string;
  imageUrl: string | null;
  foodType: FoodType | null;
  badgeLabel: string | null;
  isInSeason: boolean;
  brand: string | null;
  shortDescription: string | null;
  variants: { variantId: number; label: string }[];
};

export type CategoryPage = {
  category: Category;
  /** Set on subcategory pages. */
  parent: Category | null;
  theme: PageTheme;
  /** The admin's own colour (resolved: a subcategory gets its parent's), or null for the preset. */
  customColour?: string | null;
  /** Only enabled sections, in order; unknown types may come later and are skipped. */
  page: { hero: HeroView; sections: PageSection[] };
  /** Top level: its subcategories. Subcategory page: its siblings (for the chip row). */
  subcategories: Category[];
  summary: { productCount: number; subcategoryCount: number; inSeasonCount: number };
  rails: Record<string, ProductCard[]>;
  /** Subcategory pages with a grid: the first page of products. */
  products: Page<Product> | null;
  version: number | null;
  publishedAt: string | null;
};

// ---- the admin editor ----

export type PageImagePurpose = "HERO" | "HERO_MOBILE" | "BANNER" | "GUIDE" | "OG";
export type PageImage = { imageId: string; url: string; purpose: PageImagePurpose };

export type AdminCategoryPage = {
  categoryId: number;
  isSubcategory: boolean;
  parentCategoryId: number | null;
  /** The live theme and custom colour. */
  theme: PageTheme;
  customColour?: string | null;
  draft: PageDocument | null;
  published: PageDocument | null;
  /** The draft, else the published page, else the defaults: what the editor opens. */
  effectiveDraft: PageDocument;
  /** 0 for a page never saved. Every write sends it; a stale one gets 409 PAGE_VERSION_CONFLICT. */
  version: number;
  publishedVersion: number | null;
  publishedAt: string | null;
  publishedBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  hasUnpublishedChanges: boolean;
  /** Pictures uploaded for this category, newest first. */
  images: PageImage[];
};

export type PageHistoryItem = { version: number; theme: PageTheme; customColour?: string | null; publishedAt: string; publishedBy: string | null };

/** Writes answer with the new version. */
export type PageWriteResult = { success: boolean; message: string; version: number };
