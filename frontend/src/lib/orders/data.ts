import "server-only";
import { redirect } from "next/navigation";
import { getSessionToken } from "@/lib/auth/session";
import type { ApiFailure, ApiResult } from "@/lib/backend/client";
import { isUuidLike } from "@/lib/inventory/validation";
import * as api from "./order-service";
import type { Cart, CustomerOrder, Invoice, LedgerAccount, LedgerAccountType, LedgerEntry, OrderStatus, OrderSummary, Page, StoreLedger, StoreOrder } from "./types";

// Cart, order and ledger data for pages (server components), one backend call
// each, never cached (they're personal and change all the time). Call after
// requireRole(). An ended session goes to login and comes back; "not found"
// (wrong id, someone else's order) is null so the page can 404; anything else
// is returned for the page to show.

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export const ORDERS_PAGE_SIZE = 20;

// The store owner's tabs (the backend filters by repeated ?status=).
export const STORE_TABS = {
  new: { label: "New", statuses: ["PLACED"] },
  active: { label: "In progress", statuses: ["ACCEPTED", "PACKED", "OUT_FOR_DELIVERY"] },
  done: { label: "Done", statuses: ["DELIVERED", "REJECTED", "CANCELLED", "UNDELIVERED"] },
} as const satisfies Record<string, { label: string; statuses: OrderStatus[] }>;
export type StoreTab = keyof typeof STORE_TABS;
export const storeTab = (v: unknown): StoreTab => (v === "active" || v === "done" ? v : "new");

async function token(returnTo: string): Promise<string> {
  const t = await getSessionToken();
  if (!t) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return t;
}

function settle<T>(res: ApiResult<T>, returnTo: string, notFound?: string[]): Loaded<T | null> {
  if (res.ok) return { ok: true, data: res.data };
  if (res.error.code === "UNAUTHENTICATED") redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (res.error.code === "STORE_NOT_FOUND" && returnTo.startsWith("/seller")) redirect("/seller/store");
  if (notFound?.includes(res.error.code)) return { ok: true, data: null };
  return { ok: false, error: res.error };
}

const settleList = <T>(res: ApiResult<T>, returnTo: string) => settle(res, returnTo) as Loaded<T>;

// ---- shopper ----

export async function loadCart(returnTo: string, addressId?: string): Promise<Loaded<Cart>> {
  return settleList(await api.getCart(await token(returnTo), addressId && isUuidLike(addressId) ? addressId : undefined), returnTo);
}

export async function loadMyOrders(page: number, returnTo: string, size = ORDERS_PAGE_SIZE): Promise<Loaded<Page<OrderSummary>>> {
  return settleList(await api.listOrders(await token(returnTo), page, size), returnTo);
}

export async function loadMyOrder(orderId: string, returnTo: string): Promise<Loaded<CustomerOrder | null>> {
  if (!isUuidLike(orderId)) return { ok: true, data: null };
  return settle(await api.getOrder(await token(returnTo), orderId), returnTo, ["ORDER_NOT_FOUND"]);
}

export async function loadMyInvoice(orderId: string, returnTo: string): Promise<Loaded<Invoice | null>> {
  if (!isUuidLike(orderId)) return { ok: true, data: null };
  return settle(await api.getInvoice(await token(returnTo), orderId), returnTo, ["ORDER_NOT_FOUND", "INVOICE_NOT_FOUND"]);
}

// ---- store owner ----

export async function loadStoreOrders(tab: StoreTab, page: number, returnTo: string, size = ORDERS_PAGE_SIZE): Promise<Loaded<Page<OrderSummary>>> {
  return settleList(await api.listStoreOrders(await token(returnTo), { status: [...STORE_TABS[tab].statuses], page, size }), returnTo);
}

export async function loadStoreOrder(orderId: string, returnTo: string): Promise<Loaded<StoreOrder | null>> {
  if (!isUuidLike(orderId)) return { ok: true, data: null };
  return settle(await api.getStoreOrder(await token(returnTo), orderId), returnTo, ["ORDER_NOT_FOUND"]);
}

export async function loadStoreInvoice(orderId: string, returnTo: string): Promise<Loaded<Invoice | null>> {
  if (!isUuidLike(orderId)) return { ok: true, data: null };
  return settle(await api.getStoreInvoice(await token(returnTo), orderId), returnTo, ["ORDER_NOT_FOUND", "INVOICE_NOT_FOUND"]);
}

export async function loadStoreLedger(page: number, returnTo: string): Promise<Loaded<StoreLedger>> {
  return settleList(await api.getStoreLedger(await token(returnTo), page, ORDERS_PAGE_SIZE), returnTo);
}

// ---- admin ----

export async function loadAdminOrders(p: { status?: OrderStatus[]; storeId?: string; page: number }, returnTo: string): Promise<Loaded<Page<OrderSummary>>> {
  const storeId = p.storeId && isUuidLike(p.storeId) ? p.storeId : undefined;
  return settleList(await api.listAdminOrders(await token(returnTo), { status: p.status, storeId, page: p.page, size: ORDERS_PAGE_SIZE }), returnTo);
}

export async function loadAdminOrder(orderId: string, returnTo: string): Promise<Loaded<StoreOrder | null>> {
  if (!isUuidLike(orderId)) return { ok: true, data: null };
  return settle(await api.getAdminOrder(await token(returnTo), orderId), returnTo, ["ORDER_NOT_FOUND"]);
}

export async function loadLedgerAccounts(type: LedgerAccountType | undefined, page: number, returnTo: string): Promise<Loaded<Page<LedgerAccount>>> {
  return settleList(await api.listLedgerAccounts(await token(returnTo), { type, page, size: ORDERS_PAGE_SIZE }), returnTo);
}

export async function loadLedgerEntries(accountId: number, page: number, returnTo: string): Promise<Loaded<Page<LedgerEntry> | null>> {
  if (!Number.isSafeInteger(accountId) || accountId <= 0) return { ok: true, data: null };
  return settle(await api.ledgerEntries(await token(returnTo), accountId, page, ORDERS_PAGE_SIZE), returnTo, ["LEDGER_ACCOUNT_NOT_FOUND"]);
}
