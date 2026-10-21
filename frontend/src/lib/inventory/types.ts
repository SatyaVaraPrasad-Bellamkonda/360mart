// JSON shapes of the seller products & stock APIs (/api/v1/seller/catalog,
// /api/v1/seller/store/products…). Types and constants only, so client
// components may import them too.

import type { FoodType, ProductUnit } from "@/lib/catalog/types";

export type MovementType = "RESTOCK" | "RETURN" | "DAMAGED" | "ADJUSTMENT" | "SALE" | "ORDER_CANCELLED" | "EXPIRED";

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  RESTOCK: "Stock added",
  RETURN: "Customer return",
  DAMAGED: "Damaged",
  ADJUSTMENT: "Count corrected",
  SALE: "Sold",
  ORDER_CANCELLED: "Order cancelled",
  EXPIRED: "Expired",
};

export type Page<T> = { items: T[]; page: number; size: number; totalItems: number; totalPages: number };

// 1. The catalogue the owner picks from.
export type CatalogVariant = { variantId: number; label: string; quantity: number; unit: ProductUnit; listingId: string | null };
export type CatalogProduct = { productId: number; categoryId: number; name: string; brand: string | null; foodType: FoodType | null; imageUrl: string | null; variants: CatalogVariant[] };

// 3 & 4. One size the store sells ("listing").
export type Listing = {
  listingId: string;
  productId: number;
  productName: string;
  productImageUrl: string | null;
  variantId: number;
  variantLabel: string;
  quantity: number;
  unit: ProductUnit;
  price: number;
  mrp: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  maxPerOrder: number | null;
  isAvailable: boolean;
  tracksBatches: boolean;
  storeSku: string | null;
  createdAt: string;
  updatedAt: string;
};

// 2 & 5. variantId and openingStock only on create; the update replaces every field.
export type ListingInput = {
  variantId?: number;
  openingStock?: number;
  price: number;
  mrp: number;
  lowStockThreshold: number;
  maxPerOrder: number | null;
  isAvailable: boolean;
  tracksBatches: boolean;
  storeSku: string | null;
};

/** The add / edit form's values (text as typed). */
export type ListingDraft = {
  price: string;
  mrp: string;
  openingStock: string;
  lowStockThreshold: string;
  maxPerOrder: string;
  isAvailable: boolean;
  tracksBatches: boolean;
  storeSku: string;
};
export type ListingErrors = Partial<Record<keyof ListingDraft, string>>;

// 6.
export type PriceChange = { oldPrice: number; newPrice: number; oldMrp: number; newMrp: number; changedAt: string };

// 7. The owner's stock buttons (SALE etc. only come from the system).
export type StockAction = "RESTOCK" | "RETURN" | "DAMAGED" | "ADJUSTMENT";
export type StockAdjustmentInput = { movementType: StockAction; quantityChange: number; reason?: string; batchId?: string };
/** The stock dialog's values: a positive number as typed; the sign comes from the action (or the +/- choice for a count correction). */
export type StockDraft = { action: StockAction; quantity: string; direction: "add" | "remove"; reason: string; batchId: string };
export type StockErrors = Partial<Record<"quantity" | "reason" | "batchId", string>>;

// 8 & 9.
export type BatchInput = { quantity: number; expiresOn: string; manufacturedOn?: string; batchNo?: string; costPrice?: number };
export type BatchDraft = { quantity: string; expiresOn: string; manufacturedOn: string; batchNo: string; costPrice: string };
export type BatchErrors = Partial<Record<keyof BatchDraft, string>>;
export type Batch = {
  batchId: string;
  batchNo: string | null;
  quantityReceived: number;
  quantityRemaining: number;
  costPrice: number | null;
  manufacturedOn: string | null;
  expiresOn: string;
  receivedAt: string;
};

// 10.
export type StockMovement = { movementType: MovementType; quantityChange: number; quantityAfter: number; reason: string | null; batchId: string | null; createdAt: string };

/** "My products" tabs and their query. */
export const LISTING_TABS = [
  { id: "all", label: "All" },
  { id: "low", label: "Low stock" },
  { id: "hidden", label: "Hidden" },
] as const;
export type ListingTab = (typeof LISTING_TABS)[number]["id"];
