import { api, type ApiResult } from "@/lib/api-client";
import { isUuidLike } from "@/lib/inventory/validation";
import { refreshPagesAction } from "./refresh-action";
import { CART_ITEM_LIMIT, MAX_QUANTITY, NOTE_MAX, REASON_MAX, REASON_MIN, type Cart, type CustomerOrder, type WriteResult } from "./types";

// The shopper's cart, checkout and cancel, called straight from the browser
// (/api/v1/cart…, /api/v1/checkout, /api/v1/orders/…: each visible in
// DevTools → Network). The same input checks and messages as the server
// actions they replace; the backend checks everything again. After a change,
// refreshPagesAction() re-renders the pages that show it (/cart, /account…)
// without another backend call, so back/forward never shows an old copy.

export type CartLines = { itemCount: number; lines: Record<string, number> };

export const linesOf = (cart: Cart): CartLines => ({
  itemCount: cart.itemCount,
  lines: Object.fromEntries(cart.stores.flatMap((s) => s.items.map((i) => [i.listingId, i.quantity]))),
});

const addressQuery = (addressId?: string | null) => (addressId && isUuidLike(addressId) ? `?addressId=${addressId}` : "");

function fail(code: string, message: string, fieldErrors: Record<string, string> = {}): ApiResult<never> {
  return { ok: false, error: { status: 0, code, message, fieldErrors, issues: [] } };
}

/** The whole cart, priced live (with deliverability when an address is given). */
export const loadCart = (addressId?: string | null) => api<Cart>(`/cart${addressQuery(addressId)}`);

/** What's in the cart (listing → quantity), for the header badge and the product page's steppers. */
export async function loadCartLines(): Promise<ApiResult<CartLines>> {
  const res = await loadCart();
  return res.ok ? { ok: true, data: linesOf(res.data) } : res;
}

/**
 * Sets one item's quantity (0 removes it). With `reload`, also returns the
 * fresh cart (the cart page shows new totals and issues right away).
 */
export async function setCartItem(input: { listingId: string; quantity: number; addressId?: string | null; reload?: boolean }): Promise<ApiResult<{ message: string; cart: Cart | null }>> {
  if (!isUuidLike(input.listingId)) return fail("VALIDATION_FAILED", "This item is no longer available. Please refresh the page.");
  const qty = input.quantity;
  if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QUANTITY) return fail("VALIDATION_FAILED", `Choose a quantity from 1 to ${MAX_QUANTITY}.`);
  const path = `/cart/items/${input.listingId}`;
  const res = qty === 0 ? await api<WriteResult>(path, { method: "DELETE" }) : await api<WriteResult>(path, { method: "PUT", body: { quantity: qty } });
  if (!res.ok) return res;
  void refreshPagesAction("cart");
  let cart: Cart | null = null;
  if (input.reload) {
    const fresh = await loadCart(input.addressId);
    if (fresh.ok) cart = fresh.data;
  }
  return { ok: true, data: { message: res.data?.message ?? "Cart updated.", cart } };
}

export async function clearCart(): Promise<ApiResult<{ message: string }>> {
  const res = await api<WriteResult>("/cart", { method: "DELETE" });
  if (!res.ok) return res;
  void refreshPagesAction("cart");
  return { ok: true, data: { message: res.data?.message ?? "Your cart is empty." } };
}

/**
 * A guest's browser cart, sent once right after login or signup. Items that
 * can't be bought are skipped by the backend; it never fails over one item.
 * Returns the merged cart's lines so the badge updates without another call.
 */
export async function mergeGuestCart(items: { listingId: string; quantity: number }[]): Promise<ApiResult<{ message: string; cart: CartLines | null }>> {
  const list = items
    .filter((i) => isUuidLike(i.listingId) && Number.isInteger(i.quantity) && i.quantity >= 1)
    .map((i) => ({ listingId: i.listingId, quantity: Math.min(i.quantity, MAX_QUANTITY) }))
    .slice(0, CART_ITEM_LIMIT);
  if (!list.length) return fail("VALIDATION_FAILED", "Nothing to add.");
  const res = await api<WriteResult>("/cart/merge", { method: "POST", body: { items: list } });
  if (!res.ok) return res;
  void refreshPagesAction("cart");
  const fresh = await loadCartLines();
  return { ok: true, data: { message: res.data?.message ?? "Your cart is updated.", cart: fresh.ok ? fresh.data : null } };
}

/**
 * Places the checkout. All or nothing on the backend; the idempotency key
 * (made once per checkout of this exact cart in the browser) means a retry,
 * double tap or lost connection never orders twice.
 */
export async function placeOrder(input: { idempotencyKey: string; addressId: string; stores: { storeId: string; note?: string }[]; expectedTotal: number }): Promise<ApiResult<{ message: string; ids: string[] }>> {
  if (!isUuidLike(input.idempotencyKey)) return fail("VALIDATION_FAILED", "This page has expired. Please refresh and try again.");
  if (!isUuidLike(input.addressId)) return fail("VALIDATION_FAILED", "Choose a delivery address.", { addressId: "Choose a delivery address." });
  const stores = input.stores.filter((s) => isUuidLike(s.storeId)).map((s) => ({ storeId: s.storeId, note: s.note?.trim() || undefined }));
  if (stores.length < 1 || stores.length > 10 || new Set(stores.map((s) => s.storeId)).size !== stores.length) return fail("VALIDATION_FAILED", "Choose the stores to order from (up to 10).");
  const longNote = stores.find((s) => (s.note?.length ?? 0) > NOTE_MAX);
  if (longNote) return fail("VALIDATION_FAILED", `Keep each note under ${NOTE_MAX} characters.`, { [`stores[${longNote.storeId}]`]: `Keep the note under ${NOTE_MAX} characters.` });
  if (!Number.isFinite(input.expectedTotal) || input.expectedTotal < 0) return fail("VALIDATION_FAILED", "Please refresh the page and try again.");

  const res = await api<WriteResult>("/checkout", {
    method: "POST",
    body: { idempotencyKey: input.idempotencyKey, addressId: input.addressId, paymentMethod: "COD", stores, expectedTotal: Math.round(input.expectedTotal * 100) / 100 },
  });
  if (!res.ok) return res;
  await refreshPagesAction("orders");
  return { ok: true, data: { message: res.data.message, ids: res.data.ids ?? [] } };
}

/** Cancel while the store hasn't accepted yet; returns the fresh order. */
export async function cancelOrder(orderId: string, reasonInput: string): Promise<ApiResult<{ message: string; order: CustomerOrder | null }>> {
  if (!isUuidLike(orderId)) return fail("VALIDATION_FAILED", "Order not found.");
  const reason = reasonInput.trim();
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
    const m = `Tell us why in ${REASON_MIN} to ${REASON_MAX} characters.`;
    return fail("VALIDATION_FAILED", m, { reason: m });
  }
  const res = await api<WriteResult>(`/orders/${orderId}/cancel`, { method: "POST", body: { reason } });
  if (!res.ok) return res;
  void refreshPagesAction("orders");
  const fresh = await api<CustomerOrder>(`/orders/${orderId}`);
  return { ok: true, data: { message: res.data.message, order: fresh.ok ? fresh.data : null } };
}
