// Listing, stock and batch rules, the same as the backend's StoreProductRequest,
// StockAdjustmentRequest and StockBatchRequest (checked in the browser for instant
// feedback, again in the server action, and finally by the backend).
// Safe for client components.

import { todayInIndia } from "@/lib/stores/validation";
import type { BatchDraft, BatchErrors, BatchInput, Listing, ListingDraft, ListingErrors, ListingInput, StockAction, StockAdjustmentInput, StockDraft, StockErrors } from "./types";

export const STOCK_MAX = 100_000;
export const MAX_PER_ORDER = 1000;
export const REASON_MAX = 300;

const MONEY = /^\d{1,8}(\.\d{1,2})?$/;
const WHOLE = /^\d{1,6}$/;
const SKU = /^[A-Za-z0-9_-]{1,50}$/;
const BATCH_NO = /^[A-Za-z0-9/-]{1,50}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_LINE = /^[^\x00-\x1F\x7F<>]*$/;

// "₹349", or "₹20.50" when there are paise.
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const money = (n: number) => rupees.format(n);

/** Whole-number percentage off MRP (0 when there's no discount). */
export function discountPercent(price: number, mrp: number): number {
  return mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
}

export type StockState = "out" | "low" | "ok";
export function stockState(l: Pick<Listing, "stockQuantity" | "isLowStock">): StockState {
  return l.stockQuantity <= 0 ? "out" : l.isLowStock ? "low" : "ok";
}

// ---- listing (add / edit) ----

export function emptyListingDraft(): ListingDraft {
  return { price: "", mrp: "", openingStock: "", lowStockThreshold: "5", maxPerOrder: "", isAvailable: true, tracksBatches: false, storeSku: "" };
}

export function toListingDraft(l: Listing): ListingDraft {
  return {
    price: String(l.price),
    mrp: String(l.mrp),
    openingStock: "",
    lowStockThreshold: String(l.lowStockThreshold),
    maxPerOrder: l.maxPerOrder == null ? "" : String(l.maxPerOrder),
    isAvailable: l.isAvailable,
    tracksBatches: l.tracksBatches,
    storeSku: l.storeSku ?? "",
  };
}

/** `creating` adds the opening-stock rule (it's only sent when listing). */
export function listingErrors(d: ListingDraft, creating: boolean): ListingErrors {
  const e: ListingErrors = {};
  const price = d.price.trim();
  const mrp = d.mrp.trim();
  if (!mrp) e.mrp = "Enter the MRP";
  else if (!MONEY.test(mrp) || Number(mrp) <= 0) e.mrp = "MRP must be more than 0, with at most 2 decimals";
  if (!price) e.price = "Enter your selling price";
  else if (!MONEY.test(price) || Number(price) <= 0) e.price = "Price must be more than 0, with at most 2 decimals";
  else if (!e.mrp && Number(price) > Number(mrp)) e.price = "Your price can't be more than the MRP";

  const stock = d.openingStock.trim();
  if (creating && !d.tracksBatches && stock && (!WHOLE.test(stock) || Number(stock) > STOCK_MAX)) e.openingStock = `Enter a whole number from 0 to ${STOCK_MAX.toLocaleString("en-IN")}`;

  const low = d.lowStockThreshold.trim();
  if (low && (!WHOLE.test(low) || Number(low) > STOCK_MAX)) e.lowStockThreshold = `Enter a whole number from 0 to ${STOCK_MAX.toLocaleString("en-IN")}`;
  const max = d.maxPerOrder.trim();
  if (max && (!WHOLE.test(max) || Number(max) < 1 || Number(max) > MAX_PER_ORDER)) e.maxPerOrder = `Enter 1 to ${MAX_PER_ORDER}, or leave empty for no limit`;
  const sku = d.storeSku.trim();
  if (sku && !SKU.test(sku)) e.storeSku = "Use letters, digits, - and _ (up to 50)";
  return e;
}

/** Every field, every time: the update replaces the whole listing. */
export function toListingInput(d: ListingDraft, create?: { variantId: number }): ListingInput {
  const max = d.maxPerOrder.trim();
  return {
    ...(create ? { variantId: create.variantId, openingStock: d.tracksBatches ? 0 : Number(d.openingStock.trim() || 0) } : {}),
    price: Number(d.price.trim()),
    mrp: Number(d.mrp.trim()),
    lowStockThreshold: Number(d.lowStockThreshold.trim() || 0),
    maxPerOrder: max ? Number(max) : null,
    isAvailable: d.isAvailable,
    tracksBatches: d.tracksBatches,
    storeSku: d.storeSku.trim() || null,
  };
}

export function readListingDraft(input: unknown): ListingDraft | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  return {
    price: str("price"),
    mrp: str("mrp"),
    openingStock: str("openingStock"),
    lowStockThreshold: str("lowStockThreshold"),
    maxPerOrder: str("maxPerOrder"),
    isAvailable: r.isAvailable !== false,
    tracksBatches: r.tracksBatches === true,
    storeSku: str("storeSku"),
  };
}

// ---- stock actions ----

/** The sign each button gives the quantity (a count correction asks the owner). */
export function signedQuantity(d: Pick<StockDraft, "action" | "quantity" | "direction">): number {
  const n = Number(d.quantity.trim());
  if (d.action === "DAMAGED") return -n;
  if (d.action === "ADJUSTMENT") return d.direction === "remove" ? -n : n;
  return n;
}

const needsReason = (a: StockAction) => a === "DAMAGED" || a === "ADJUSTMENT";

export function stockErrors(d: StockDraft, opts: { tracksBatches: boolean; stock: number; batchRemaining?: number }): StockErrors {
  const e: StockErrors = {};
  const q = d.quantity.trim();
  if (!WHOLE.test(q) || Number(q) < 1 || Number(q) > STOCK_MAX) e.quantity = `Enter a whole number from 1 to ${STOCK_MAX.toLocaleString("en-IN")}`;
  else {
    const change = signedQuantity(d);
    const left = opts.tracksBatches && opts.batchRemaining != null ? opts.batchRemaining : opts.stock;
    if (change < 0 && -change > left) e.quantity = opts.tracksBatches && opts.batchRemaining != null ? `Only ${left} left in this batch` : `Only ${left} in stock`;
  }
  const reason = d.reason.trim();
  if (needsReason(d.action) && !reason) e.reason = d.action === "DAMAGED" ? "Say what happened (e.g. crushed in transit)" : "Say why the count changed (e.g. stock count 21 Oct)";
  else if (reason.length > REASON_MAX) e.reason = `At most ${REASON_MAX} characters`;
  else if (!SAFE_LINE.test(reason)) e.reason = "Reason contains characters that are not allowed";
  if (opts.tracksBatches && !d.batchId) e.batchId = "Choose the batch this change belongs to";
  return e;
}

export function toStockInput(d: StockDraft, tracksBatches: boolean): StockAdjustmentInput {
  const reason = d.reason.trim();
  return { movementType: d.action, quantityChange: signedQuantity(d), ...(reason ? { reason } : {}), ...(tracksBatches && d.batchId ? { batchId: d.batchId } : {}) };
}

export function readStockDraft(input: unknown): StockDraft | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const actions: StockAction[] = ["RESTOCK", "RETURN", "DAMAGED", "ADJUSTMENT"];
  if (!actions.includes(r.action as StockAction)) return null;
  const str = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  return { action: r.action as StockAction, quantity: str("quantity"), direction: r.direction === "remove" ? "remove" : "add", reason: str("reason"), batchId: str("batchId") };
}

// ---- batches ----

export function emptyBatchDraft(): BatchDraft {
  return { quantity: "", expiresOn: "", manufacturedOn: "", batchNo: "", costPrice: "" };
}

export function batchErrors(d: BatchDraft): BatchErrors {
  const e: BatchErrors = {};
  const today = todayInIndia();
  const q = d.quantity.trim();
  if (!WHOLE.test(q) || Number(q) < 1 || Number(q) > STOCK_MAX) e.quantity = `Enter a whole number from 1 to ${STOCK_MAX.toLocaleString("en-IN")}`;
  if (!DATE.test(d.expiresOn)) e.expiresOn = "Choose the expiry date";
  else if (d.expiresOn < today) e.expiresOn = "This date has already passed";
  if (d.manufacturedOn) {
    if (!DATE.test(d.manufacturedOn)) e.manufacturedOn = "Enter a valid date";
    else if (d.manufacturedOn > today) e.manufacturedOn = "Can't be in the future";
    else if (DATE.test(d.expiresOn) && d.manufacturedOn > d.expiresOn) e.manufacturedOn = "Must be before the expiry date";
  }
  const no = d.batchNo.trim();
  if (no && !BATCH_NO.test(no)) e.batchNo = "Use letters, digits, / and - (up to 50)";
  const cost = d.costPrice.trim();
  if (cost && !MONEY.test(cost)) e.costPrice = "Enter 0 or more, with at most 2 decimals";
  return e;
}

export function toBatchInput(d: BatchDraft): BatchInput {
  return {
    quantity: Number(d.quantity.trim()),
    expiresOn: d.expiresOn,
    ...(d.manufacturedOn ? { manufacturedOn: d.manufacturedOn } : {}),
    ...(d.batchNo.trim() ? { batchNo: d.batchNo.trim() } : {}),
    ...(d.costPrice.trim() ? { costPrice: Number(d.costPrice.trim()) } : {}),
  };
}

export function readBatchDraft(input: unknown): BatchDraft | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const str = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  return { quantity: str("quantity"), expiresOn: str("expiresOn"), manufacturedOn: str("manufacturedOn"), batchNo: str("batchNo"), costPrice: str("costPrice") };
}

/** Days from today (India) to a YYYY-MM-DD date; negative = past. */
export function daysUntil(date: string): number {
  const a = Date.parse(`${todayInIndia()}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export const isUuidLike = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
