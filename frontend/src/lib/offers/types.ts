// JSON shape of GET /products/{productId}/variants/{variantId}/stores: the stores
// that deliver one size to a location, best offer first. Types only.

import type { ProductUnit } from "@/lib/catalog/types";
import type { Page } from "@/lib/inventory/types";

export type StoreOffer = {
  storeId: string;
  storeName: string;
  storeSlug: string;
  logoUrl: string | null;
  area: string | null;
  city: string | null;
  /** This store's offer for this size (Add to cart will use it). */
  listingId: string;
  price: number;
  mrp: number;
  discountAmount: number;
  discountPercent: number;
  isInStock: boolean;
  /** The most this customer can add from this store (0 when out of stock). The exact stock is never sent. */
  maxOrderQuantity: number;
  distanceKm: number;
  deliveryFee: number;
  minOrderAmount: number;
  isOpenNow: boolean;
};

export type ProductStoreOffers = {
  productId: number;
  productName: string;
  imageUrl: string | null;
  variantId: number;
  variantLabel: string;
  quantity: number;
  unit: ProductUnit;
  stores: Page<StoreOffer>;
};
