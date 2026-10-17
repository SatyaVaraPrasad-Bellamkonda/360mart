// Product and size rules, the same as the backend's MasterProductRequest.java and
// MasterProductVariantRequest.java (checked in the browser, again in the server
// action, and finally by the backend), plus how sizes and food marks are shown.
// Safe for client components.

import { collapse } from "@/lib/addresses/validation";
import type { FoodType, Product, ProductDraft, ProductErrors, ProductInput, ProductUnit, ProductVariant, VariantDraft, VariantErrors, VariantInput } from "./types";
import { CATALOG_NAME, SAFE_LINE, SAFE_MULTILINE, SLUG, slugFromName } from "./validation";

export const PRODUCT_LIMITS = {
  name: 150,
  slug: 160,
  brand: 100,
  shortDescription: 300,
  description: 5000,
  origin: 100,
  bestSeason: 100,
  storageTip: 500,
  shelfLifeDays: 3650,
  badgeLabel: 30,
  seoTitle: 70,
  seoDescription: 160,
  gstRate: 40,
  displayOrder: 100_000,
} as const;

export const VARIANT_LIMITS = { label: 50, sku: 50, displayOrder: 100_000, perProduct: 20 } as const;

const HSN_CODE = /^[0-9]{4}([0-9]{2}){0,2}$/;
const SKU = /^[A-Za-z0-9_-]+$/;
const GST = /^\d{1,2}(\.\d{1,2})?$/;
const QUANTITY = /^\d{1,7}(\.\d{1,3})?$/;

export const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "VEG", label: "Veg" },
  { value: "NON_VEG", label: "Non-veg" },
  { value: "EGG", label: "Contains egg" },
];

/** The 9 units with the short names people read ("kg", "g", "pcs"). */
export const UNITS: { value: ProductUnit; short: string; label: string }[] = [
  { value: "KG", short: "kg", label: "kg (kilogram)" },
  { value: "GRAM", short: "g", label: "g (gram)" },
  { value: "MILLIGRAM", short: "mg", label: "mg (milligram)" },
  { value: "LITRE", short: "L", label: "L (litre)" },
  { value: "MILLILITRE", short: "ml", label: "ml (millilitre)" },
  { value: "PIECE", short: "pcs", label: "pcs (pieces)" },
  { value: "DOZEN", short: "dozen", label: "dozen" },
  { value: "PACK", short: "pack", label: "pack" },
  { value: "BUNCH", short: "bunch", label: "bunch" },
];
const UNIT_SHORT = Object.fromEntries(UNITS.map((u) => [u.value, u.short])) as Record<ProductUnit, string>;
const isUnit = (value: unknown): value is ProductUnit => UNITS.some((u) => u.value === value);
const isFoodType = (value: unknown): value is FoodType => FOOD_TYPES.some((f) => f.value === value);

/** Common sizes as one-tap shortcuts in the admin size form. */
export const SIZE_PRESETS: { quantity: number; unit: ProductUnit }[] = [
  { quantity: 250, unit: "GRAM" },
  { quantity: 500, unit: "GRAM" },
  { quantity: 1, unit: "KG" },
  { quantity: 2, unit: "KG" },
  { quantity: 1, unit: "PIECE" },
  { quantity: 6, unit: "PIECE" },
  { quantity: 1, unit: "DOZEN" },
  { quantity: 500, unit: "MILLILITRE" },
  { quantity: 1, unit: "LITRE" },
  { quantity: 1, unit: "BUNCH" },
];

/** "1.500" → "1.5", 5 → "5": numbers as people write them. */
export function formatNumber(value: number): string {
  return String(Number(value.toFixed(3)));
}

/** A size as text from its amount: 1 KG → "1 kg", 500 GRAM → "500 g". */
export function sizeText(quantity: number, unit: ProductUnit): string {
  return `${formatNumber(quantity)} ${UNIT_SHORT[unit]}`;
}

/** "5% GST" (or null when not set). */
export function gstText(rate: number | null): string | null {
  return rate === null ? null : `${formatNumber(rate)}% GST`;
}

export function foodTypeLabel(type: FoodType | null): string | null {
  return FOOD_TYPES.find((f) => f.value === type)?.label ?? null;
}

/** "Best within 7 days", "Best within 1 year" (whole years only). */
export function shelfLifeText(days: number | null): string | null {
  if (!days) return null;
  if (days % 365 === 0) return `${days / 365} ${days === 365 ? "year" : "years"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** Sizes in the order shoppers see them. */
export function sortVariants(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort((a, b) => a.displayOrder - b.displayOrder || a.variantId - b.variantId);
}

// ---- Product form ----

export function productSlug(draft: Pick<ProductDraft, "name" | "slug">): string | null {
  return draft.slug.trim() || slugFromName(collapse(draft.name), PRODUCT_LIMITS.slug);
}

export function productErrors(draft: ProductDraft): ProductErrors {
  const errors: ProductErrors = {};
  if (!(Number.isSafeInteger(draft.categoryId) && draft.categoryId > 0)) errors.categoryId = "Choose the subcategory it belongs to.";

  const name = collapse(draft.name);
  if (!name) errors.name = "Name is required";
  else if (name.length > PRODUCT_LIMITS.name) errors.name = `Name must be at most ${PRODUCT_LIMITS.name} characters`;
  else if (!CATALOG_NAME.test(name)) errors.name = "Name can contain letters, digits, spaces and & , . ' ( ) / -";

  const slug = draft.slug.trim();
  if (slug.length > PRODUCT_LIMITS.slug) errors.slug = `Slug must be at most ${PRODUCT_LIMITS.slug} characters`;
  else if (slug && !SLUG.test(slug)) errors.slug = "Slug can contain only lowercase letters, digits and single hyphens (e.g. alphonso-mango)";
  else if (name && !errors.name && !productSlug(draft)) errors.slug = "Could not build a URL slug from this name. Please enter a slug (e.g. alphonso-mango).";

  const brand = collapse(draft.brand);
  if (brand.length > PRODUCT_LIMITS.brand) errors.brand = `Brand must be at most ${PRODUCT_LIMITS.brand} characters`;
  else if (brand && !CATALOG_NAME.test(brand)) errors.brand = "Enter a valid brand name";

  const line = (key: "shortDescription" | "origin" | "bestSeason" | "badgeLabel" | "seoTitle" | "seoDescription", label: string) => {
    const value = collapse(draft[key]);
    if (value.length > PRODUCT_LIMITS[key]) errors[key] = `${label} must be at most ${PRODUCT_LIMITS[key]} characters`;
    else if (!SAFE_LINE.test(value)) errors[key] = `${label} contains characters that are not allowed`;
  };
  const block = (key: "description" | "storageTip", label: string) => {
    const value = draft[key].trim();
    if (value.length > PRODUCT_LIMITS[key]) errors[key] = `${label} must be at most ${PRODUCT_LIMITS[key]} characters`;
    else if (!SAFE_MULTILINE.test(value)) errors[key] = `${label} contains characters that are not allowed`;
  };
  line("shortDescription", "Short description");
  block("description", "Description");
  line("origin", "Origin");
  line("bestSeason", "Best season");
  block("storageTip", "Storage tip");
  line("badgeLabel", "Badge label");
  line("seoTitle", "SEO title");
  line("seoDescription", "SEO description");

  if (draft.foodType && !isFoodType(draft.foodType)) errors.foodType = "Choose veg, non-veg or egg.";

  const shelf = draft.shelfLifeDays.trim();
  if (shelf && !/^\d+$/.test(shelf)) errors.shelfLifeDays = "Shelf life must be a whole number of days";
  else if (shelf && Number(shelf) < 1) errors.shelfLifeDays = "Shelf life must be at least 1 day";
  else if (Number(shelf) > PRODUCT_LIMITS.shelfLifeDays) errors.shelfLifeDays = "Shelf life must be at most 3650 days (10 years)";

  const hsn = draft.hsnCode.trim();
  if (hsn && !HSN_CODE.test(hsn)) errors.hsnCode = "HSN code must be 4, 6 or 8 digits";

  const gst = draft.gstRate.trim();
  if (gst && !GST.test(gst)) errors.gstRate = "GST rate can have at most 2 decimal places";
  else if (Number(gst) > PRODUCT_LIMITS.gstRate) errors.gstRate = "GST rate must be at most 40%";

  const order = draft.displayOrder.trim();
  if (order && !/^\d+$/.test(order)) errors.displayOrder = "Display order must be a whole number";
  else if (Number(order) > PRODUCT_LIMITS.displayOrder) errors.displayOrder = `Display order must be at most ${PRODUCT_LIMITS.displayOrder}`;
  return errors;
}

/** Every field, every time: the update replaces the whole product, and a missing field would be cleared. */
export function toProductInput(draft: ProductDraft): ProductInput {
  const optional = (value: string) => collapse(value) || null;
  const number = (value: string) => (value.trim() ? Number(value.trim()) : null);
  return {
    categoryId: draft.categoryId,
    name: collapse(draft.name),
    slug: draft.slug.trim() || null,
    brand: optional(draft.brand),
    shortDescription: optional(draft.shortDescription),
    description: draft.description.trim() || null,
    foodType: draft.foodType || null,
    origin: optional(draft.origin),
    bestSeason: optional(draft.bestSeason),
    storageTip: draft.storageTip.trim() || null,
    shelfLifeDays: number(draft.shelfLifeDays),
    isInSeason: draft.isInSeason,
    badgeLabel: optional(draft.badgeLabel),
    hsnCode: draft.hsnCode.trim() || null,
    gstRate: number(draft.gstRate),
    seoTitle: optional(draft.seoTitle),
    seoDescription: optional(draft.seoDescription),
    displayOrder: Number(draft.displayOrder.trim() || 0),
    isFeatured: draft.isFeatured,
    isActive: draft.isActive,
  };
}

export function toProductDraft(product: Product): ProductDraft {
  return {
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    brand: product.brand ?? "",
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    foodType: product.foodType ?? "",
    origin: product.origin ?? "",
    bestSeason: product.bestSeason ?? "",
    storageTip: product.storageTip ?? "",
    shelfLifeDays: product.shelfLifeDays === null ? "" : String(product.shelfLifeDays),
    isInSeason: product.isInSeason,
    badgeLabel: product.badgeLabel ?? "",
    hsnCode: product.hsnCode ?? "",
    gstRate: product.gstRate === null ? "" : formatNumber(product.gstRate),
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    displayOrder: String(product.displayOrder),
    isFeatured: product.isFeatured,
    isActive: product.isActive,
  };
}

export function emptyProductDraft(categoryId = 0): ProductDraft {
  return {
    categoryId,
    name: "",
    slug: "",
    brand: "",
    shortDescription: "",
    description: "",
    foodType: "",
    origin: "",
    bestSeason: "",
    storageTip: "",
    shelfLifeDays: "",
    isInSeason: false,
    badgeLabel: "",
    hsnCode: "",
    gstRate: "",
    seoTitle: "",
    seoDescription: "",
    displayOrder: "0",
    isFeatured: false,
    isActive: true,
  };
}

const PRODUCT_TEXT_FIELDS = [
  "name", "slug", "brand", "shortDescription", "description", "origin", "bestSeason", "storageTip",
  "shelfLifeDays", "badgeLabel", "hsnCode", "gstRate", "seoTitle", "seoDescription", "displayOrder",
] as const;

/** A draft from untrusted input (a server action argument), or null when it isn't shaped like one. */
export function readProductDraft(input: unknown): ProductDraft | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.categoryId !== "number") return null;
  if (raw.foodType !== "" && !isFoodType(raw.foodType)) return null;
  if (PRODUCT_TEXT_FIELDS.some((key) => typeof raw[key] !== "string")) return null;
  if (typeof raw.isInSeason !== "boolean" || typeof raw.isFeatured !== "boolean" || typeof raw.isActive !== "boolean") return null;
  const text = Object.fromEntries(PRODUCT_TEXT_FIELDS.map((key) => [key, raw[key] as string])) as Record<(typeof PRODUCT_TEXT_FIELDS)[number], string>;
  return { ...text, categoryId: raw.categoryId, foodType: raw.foodType as FoodType | "", isInSeason: raw.isInSeason, isFeatured: raw.isFeatured, isActive: raw.isActive };
}

// ---- Size form ----

export function variantErrors(draft: VariantDraft): VariantErrors {
  const errors: VariantErrors = {};
  const label = collapse(draft.label);
  if (!label) errors.label = 'Label is required (e.g. "1 kg", "6 pcs")';
  else if (label.length > VARIANT_LIMITS.label) errors.label = `Label must be at most ${VARIANT_LIMITS.label} characters`;
  else if (!SAFE_LINE.test(label)) errors.label = "Label contains characters that are not allowed";

  const quantity = draft.quantity.trim();
  if (!quantity) errors.quantity = "Quantity is required";
  else if (!QUANTITY.test(quantity)) errors.quantity = "Quantity can have at most 7 digits and 3 decimal places";
  else if (Number(quantity) <= 0) errors.quantity = "Quantity must be greater than 0";

  if (!isUnit(draft.unit)) errors.unit = "Unit is required";

  const sku = draft.sku.trim();
  if (sku.length > VARIANT_LIMITS.sku) errors.sku = `SKU must be at most ${VARIANT_LIMITS.sku} characters`;
  else if (sku && !SKU.test(sku)) errors.sku = "SKU can contain only letters, digits, - and _";

  const order = draft.displayOrder.trim();
  if (order && !/^\d+$/.test(order)) errors.displayOrder = "Display order must be a whole number";
  else if (Number(order) > VARIANT_LIMITS.displayOrder) errors.displayOrder = `Display order must be at most ${VARIANT_LIMITS.displayOrder}`;
  return errors;
}

export function toVariantInput(draft: VariantDraft): VariantInput {
  return {
    label: collapse(draft.label),
    quantity: Number(draft.quantity.trim()),
    unit: draft.unit,
    sku: draft.sku.trim() || null,
    displayOrder: Number(draft.displayOrder.trim() || 0),
    isActive: draft.isActive,
  };
}

export function toVariantDraft(variant: ProductVariant): VariantDraft {
  return {
    label: variant.label,
    quantity: formatNumber(variant.quantity),
    unit: variant.unit,
    sku: variant.sku ?? "",
    displayOrder: String(variant.displayOrder),
    isActive: variant.isActive,
  };
}

export function emptyVariantDraft(displayOrder = 0): VariantDraft {
  return { label: "", quantity: "", unit: "KG", sku: "", displayOrder: String(displayOrder), isActive: true };
}

export function readVariantDraft(input: unknown): VariantDraft | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const texts = ["label", "quantity", "sku", "displayOrder"] as const;
  if (texts.some((key) => typeof raw[key] !== "string") || !isUnit(raw.unit) || typeof raw.isActive !== "boolean") return null;
  return { label: raw.label as string, quantity: raw.quantity as string, unit: raw.unit, sku: raw.sku as string, displayOrder: raw.displayOrder as string, isActive: raw.isActive };
}

/** Shop URL of a product: /fruits/mangoes/alphonso-mango. */
export function shopProductPath(category: { slug: string }, subcategory: { slug: string }, product: { slug: string }): string {
  return `/${category.slug}/${subcategory.slug}/${product.slug}`;
}
