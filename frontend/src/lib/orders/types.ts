// JSON shapes of the cart, checkout, orders, invoice and ledger APIs
// (/api/v1/cart, /checkout, /orders, /seller/store/orders, /seller/store/ledger,
// /admin/orders, /admin/ledger). Types and constants only, so client components
// may import them too. Money is in rupees, GST included, shown as it comes
// (never recalculated here). Times are UTC instants, shown in India time.

import type { FoodType } from "@/lib/catalog/types";
import type { Page } from "@/lib/inventory/types";

export type { Page };

// ---- cart ----

export type CartItem = {
  listingId: string;
  productId: number;
  variantId: number;
  productName: string;
  variantLabel: string;
  imageUrl: string | null;
  foodType: FoodType | null;
  price: number;
  mrp: number;
  quantity: number;
  /** price × quantity. */
  lineTotal: number;
  /** Stock and the per-order limit together; 0 when it can't be bought. Never above 99. */
  maxOrderQuantity: number;
  /** "Out of stock.", "Only 2 left."… null when it can be ordered. */
  issue: string | null;
};

export type CartStore = {
  storeId: string;
  storeName: string;
  storeSlug: string;
  logoUrl: string | null;
  isOpenNow: boolean;
  isAcceptingOrders: boolean;
  /** null without an address. */
  distanceKm: number | null;
  isDeliverable: boolean | null;
  deliveryFee: number;
  minOrderAmount: number;
  /** Totals count only the items without an issue. */
  itemsMrpTotal: number;
  itemsTotal: number;
  grandTotal: number;
  /** false while the store has an issue or any item has one. */
  canCheckout: boolean;
  issues: string[];
  items: CartItem[];
};

export type Cart = {
  stores: CartStore[];
  itemCount: number;
  /** Only the stores that can check out. */
  grandTotal: number;
};

export const CART_ITEM_LIMIT = 50;
export const MAX_QUANTITY = 99;

// ---- orders ----

export type OrderStatus = "PENDING_PAYMENT" | "PLACED" | "ACCEPTED" | "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "REJECTED" | "CANCELLED" | "UNDELIVERED";
export type PaymentMethod = "COD";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type OrderActor = "CUSTOMER" | "STORE" | "ADMIN" | "SYSTEM";
export type UndeliveredReason = "CUSTOMER_UNAVAILABLE" | "REFUSED" | "WRONG_ADDRESS" | "OTHER";
export type OrderAction = "ACCEPT" | "REJECT" | "PACK" | "DISPATCH" | "DELIVER" | "MARK_UNDELIVERED" | "CANCEL";

/** Still moving: shown as "open", polled, and has a delivery code. */
export const OPEN_STATUSES: OrderStatus[] = ["PENDING_PAYMENT", "PLACED", "ACCEPTED", "PACKED", "OUT_FOR_DELIVERY"];
export const isOpen = (status: OrderStatus) => OPEN_STATUSES.includes(status);

/** A row in the order lists (customer, store and admin). */
export type OrderSummary = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  storeId: string;
  storeName: string;
  customerName: string;
  itemCount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  placedAt: string;
  /** Only while PLACED: when it's cancelled if the store doesn't answer. */
  acceptBy: string | null;
};

export type OrderItem = {
  listingId: string;
  productName: string;
  variantLabel: string;
  imageUrl: string | null;
  foodType: FoodType | null;
  unitPrice: number;
  unitMrp: number;
  quantity: number;
  /** null until the store accepts; less than quantity = sent fewer, 0 = not available. */
  quantityFulfilled: number | null;
  /** unitPrice × quantity ordered (the totals already follow what was sent). */
  lineTotal: number;
};

export type DeliveryAddress = {
  name: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  deliveryInstruction: string | null;
};

export type TimelineEntry = { fromStatus: OrderStatus | null; status: OrderStatus; actor: OrderActor; note: string | null; at: string };

type OrderTimes = {
  placedAt: string;
  acceptedAt: string | null;
  packedAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  undeliveredAt: string | null;
};

type OrderMoney = {
  itemsMrpTotal: number;
  itemsTotal: number;
  discountTotal: number;
  deliveryFee: number;
  grandTotal: number;
};

/** GET /orders/{orderId} (the shopper's view). */
export type CustomerOrder = OrderTimes &
  OrderMoney & {
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    /** contactPhone only while the order is in progress. */
    store: { storeId: string; name: string; slug: string; logoUrl: string | null; contactPhone: string | null };
    deliveryAddress: DeliveryAddress;
    items: OrderItem[];
    savings: number;
    customerNote: string | null;
    /** 4 digits for the delivery person; null once the order is finished. */
    deliveryCode: string | null;
    canCancel: boolean;
    cancelledBy: OrderActor | null;
    cancelReason: string | null;
    undeliveredReason: UndeliveredReason | null;
    hasInvoice: boolean;
    timeline: TimelineEntry[];
  };

/** GET /seller/store/orders/{orderId} and GET /admin/orders/{orderId}. */
export type StoreOrder = OrderTimes &
  OrderMoney & {
    orderId: string;
    orderNumber: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    storeId: string;
    storeName: string;
    /** The phone is masked for the store once the order is finished. */
    deliveryAddress: DeliveryAddress;
    distanceKm: number | null;
    items: OrderItem[];
    customerNote: string | null;
    /** The only buttons to show. */
    allowedActions: OrderAction[];
    acceptBy: string | null;
    deliveryCodeAttemptsLeft: number;
    cancelledBy: OrderActor | null;
    cancelReason: string | null;
    undeliveredReason: UndeliveredReason | null;
    hasInvoice: boolean;
    timeline: TimelineEntry[];
  };

export type CheckoutInput = {
  idempotencyKey: string;
  addressId: string;
  paymentMethod: PaymentMethod;
  stores: { storeId: string; note?: string }[];
  expectedTotal: number;
};

/** Writes answer { success, message, ids? }. */
export type WriteResult = { success: boolean; message: string; ids?: string[] };

export const NOTE_MAX = 300;
export const REASON_MIN = 3;
export const REASON_MAX = 300;
export const DELIVERY_CODE = /^\d{4}$/;

// ---- invoice ----

export type InvoiceLine = {
  lineNo: number;
  description: string;
  hsnCode: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableValue: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
};

export type Invoice = {
  invoiceId: string;
  invoiceNumber: string;
  documentType: string;
  invoiceType: "TAX_INVOICE" | "BILL_OF_SUPPLY";
  orderId: string;
  orderNumber: string;
  financialYear: string;
  issuedAt: string;
  sellerName: string;
  sellerAddress: string;
  sellerState: string;
  sellerStateCode: string;
  sellerGstin: string | null;
  sellerFssaiLicenseNo: string | null;
  buyerName: string;
  buyerPhone: string | null;
  buyerAddress: string;
  buyerState: string;
  placeOfSupplyStateCode: string;
  supplyType: "INTRA_STATE" | "INTER_STATE";
  itemsTotal: number;
  discountTotal: number;
  deliveryFee: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
  lines: InvoiceLine[];
};

// ---- ledger ----

export type LedgerTransactionType = "ORDER_COMMISSION" | "STORE_SETTLEMENT" | "ADJUSTMENT";
export type EntryDirection = "DEBIT" | "CREDIT";

export type LedgerEntry = {
  transactionId: string;
  transactionType: LedgerTransactionType;
  description: string;
  orderId: string | null;
  orderNumber: string | null;
  direction: EntryDirection;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

/** GET /seller/store/ledger. */
export type StoreLedger = { balance: number; amountDue: number; amountOwedToStore: number; entries: Page<LedgerEntry> };

export const LEDGER_ACCOUNT_TYPES = ["STORE", "PLATFORM_COMMISSION", "GST_OUTPUT_PAYABLE", "BANK", "PAYMENT_GATEWAY", "REFUNDS_PAYABLE", "TCS_PAYABLE"] as const;
export type LedgerAccountType = (typeof LEDGER_ACCOUNT_TYPES)[number];

export type LedgerAccount = { accountId: number; accountType: LedgerAccountType; storeId: string | null; storeName: string | null; balance: number; updatedAt: string };

export type SettlementDirection = "STORE_PAID_PLATFORM" | "PLATFORM_PAID_STORE";
export type SettlementInput = { direction: SettlementDirection; amount: number; reference: string; note?: string };
export const SETTLEMENT_REFERENCE = /^[A-Za-z0-9/_-]{3,60}$/;
