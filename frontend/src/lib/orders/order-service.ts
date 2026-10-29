import "server-only";
import { callApi } from "@/lib/backend/client";
import type { Cart, CheckoutInput, CustomerOrder, Invoice, LedgerAccount, LedgerAccountType, LedgerEntry, OrderStatus, OrderSummary, Page, SettlementInput, StoreLedger, StoreOrder, UndeliveredReason, WriteResult } from "./types";

// One function per cart / checkout / orders / ledger endpoint. Every one needs
// the session (customer, store owner or admin). Writes answer { success,
// message, ids? }; screens refresh with the matching GET afterwards.

function query(params: Record<string, string | number | undefined | (string | number)[]>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => q.append(k, String(x)));
    else if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

const id = encodeURIComponent;

// ---- cart ----

export const getCart = (token: string, addressId?: string) => callApi<Cart>(`/cart${query({ addressId })}`, { sessionToken: token });
export const setCartQuantity = (token: string, listingId: string, quantity: number) => callApi<WriteResult>(`/cart/items/${id(listingId)}`, { method: "PUT", body: { quantity }, sessionToken: token });
export const removeCartItem = (token: string, listingId: string) => callApi<WriteResult>(`/cart/items/${id(listingId)}`, { method: "DELETE", sessionToken: token });
export const clearCart = (token: string) => callApi<WriteResult>("/cart", { method: "DELETE", sessionToken: token });
export const mergeCart = (token: string, items: { listingId: string; quantity: number }[]) => callApi<WriteResult>("/cart/merge", { method: "POST", body: { items }, sessionToken: token });

// ---- checkout + the shopper's orders ----

export const checkout = (token: string, input: CheckoutInput) => callApi<WriteResult>("/checkout", { method: "POST", body: input, sessionToken: token });
export const listOrders = (token: string, page: number, size: number) => callApi<Page<OrderSummary>>(`/orders${query({ page, size })}`, { sessionToken: token });
export const getOrder = (token: string, orderId: string) => callApi<CustomerOrder>(`/orders/${id(orderId)}`, { sessionToken: token });
export const cancelOrder = (token: string, orderId: string, reason: string) => callApi<WriteResult>(`/orders/${id(orderId)}/cancel`, { method: "POST", body: { reason }, sessionToken: token });
export const getInvoice = (token: string, orderId: string) => callApi<Invoice>(`/orders/${id(orderId)}/invoice`, { sessionToken: token });

// ---- store owner ----

export const listStoreOrders = (token: string, p: { status?: OrderStatus[]; page: number; size: number }) => callApi<Page<OrderSummary>>(`/seller/store/orders${query({ status: p.status, page: p.page, size: p.size })}`, { sessionToken: token });
export const getStoreOrder = (token: string, orderId: string) => callApi<StoreOrder>(`/seller/store/orders/${id(orderId)}`, { sessionToken: token });
export const getStoreInvoice = (token: string, orderId: string) => callApi<Invoice>(`/seller/store/orders/${id(orderId)}/invoice`, { sessionToken: token });
export const getStoreLedger = (token: string, page: number, size: number) => callApi<StoreLedger>(`/seller/store/ledger${query({ page, size })}`, { sessionToken: token });

const storeAction = (token: string, orderId: string, step: string, body?: unknown) => callApi<WriteResult>(`/seller/store/orders/${id(orderId)}/${step}`, { method: "POST", body, sessionToken: token });
/** Only the items that can't be sent in full; none = everything as ordered. */
export const acceptOrder = (token: string, orderId: string, items: { listingId: string; quantity: number }[]) => storeAction(token, orderId, "accept", items.length ? { items } : undefined);
export const rejectOrder = (token: string, orderId: string, reason: string) => storeAction(token, orderId, "reject", { reason });
export const packOrder = (token: string, orderId: string) => storeAction(token, orderId, "pack");
export const dispatchOrder = (token: string, orderId: string) => storeAction(token, orderId, "dispatch");
export const deliverOrder = (token: string, orderId: string, deliveryCode: string) => storeAction(token, orderId, "deliver", { deliveryCode });
export const markUndelivered = (token: string, orderId: string, reason: UndeliveredReason, note?: string) => storeAction(token, orderId, "undelivered", { reason, note });
export const storeCancelOrder = (token: string, orderId: string, reason: string) => storeAction(token, orderId, "cancel", { reason });

// ---- admin ----

export const listAdminOrders = (token: string, p: { status?: OrderStatus[]; storeId?: string; page: number; size: number }) =>
  callApi<Page<OrderSummary>>(`/admin/orders${query({ status: p.status, storeId: p.storeId, page: p.page, size: p.size })}`, { sessionToken: token });
export const getAdminOrder = (token: string, orderId: string) => callApi<StoreOrder>(`/admin/orders/${id(orderId)}`, { sessionToken: token });
export const adminCancelOrder = (token: string, orderId: string, reason: string) => callApi<WriteResult>(`/admin/orders/${id(orderId)}/cancel`, { method: "POST", body: { reason }, sessionToken: token });
export const listLedgerAccounts = (token: string, p: { type?: LedgerAccountType; page: number; size: number }) => callApi<Page<LedgerAccount>>(`/admin/ledger/accounts${query({ type: p.type, page: p.page, size: p.size })}`, { sessionToken: token });
export const ledgerEntries = (token: string, accountId: number, page: number, size: number) => callApi<Page<LedgerEntry>>(`/admin/ledger/accounts/${accountId}/entries${query({ page, size })}`, { sessionToken: token });
export const recordSettlement = (token: string, storeId: string, input: SettlementInput) => callApi<WriteResult>(`/admin/stores/${id(storeId)}/settlements`, { method: "POST", body: input, sessionToken: token });
