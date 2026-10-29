"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/actions";
import { isUuidLike } from "@/lib/inventory/validation";
import { failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "./action-helpers";
import * as api from "./order-service";
import { CART_ITEM_LIMIT, MAX_QUANTITY, type Cart } from "./types";

// The signed-in shopper's cart (stored by the backend, so it follows them to
// every device). Guests keep theirs in the browser (components/cart/cart-store)
// and send it with mergeGuestCartAction right after login.

export type CartLines = { itemCount: number; lines: Record<string, number> };

const linesOf = (cart: Cart): CartLines => ({
  itemCount: cart.itemCount,
  lines: Object.fromEntries(cart.stores.flatMap((s) => s.items.map((i) => [i.listingId, i.quantity]))),
});

const addressOrNone = (v: unknown) => (typeof v === "string" && isUuidLike(v) ? v : undefined);

/** The whole cart, priced live (with deliverability when an address is given). */
export async function loadCartAction(addressId?: unknown): Promise<ActionResult<Cart>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const res = await api.getCart(token, addressOrNone(addressId));
  return res.ok ? ok(res.data) : failWith(res.error);
}

/** What's in the cart (listing → quantity) for the header badge and the product page's steppers. One call. */
export async function cartLinesAction(): Promise<ActionResult<CartLines>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const res = await api.getCart(token);
  return res.ok ? ok(linesOf(res.data)) : failWith(res.error);
}

/**
 * Sets one item's quantity (0 removes it). With `reload`, also returns the
 * fresh cart (the cart page shows new totals and issues right away).
 */
export async function setCartItemAction(input: { listingId: unknown; quantity: unknown; addressId?: unknown; reload?: boolean }): Promise<ActionResult<{ message: string; cart: Cart | null }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(input.listingId)) return invalid("This item is no longer available. Please refresh the page.");
  const qty = input.quantity;
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 0 || qty > MAX_QUANTITY) return invalid(`Choose a quantity from 1 to ${MAX_QUANTITY}.`);

  const res = qty === 0 ? await api.removeCartItem(token, input.listingId) : await api.setCartQuantity(token, input.listingId, qty);
  if (!res.ok) return failWith(res.error);
  revalidatePath("/cart");
  let cart: Cart | null = null;
  if (input.reload) {
    const fresh = await api.getCart(token, addressOrNone(input.addressId));
    if (fresh.ok) cart = fresh.data;
  }
  return ok({ message: res.data?.message ?? "Cart updated.", cart });
}

export async function clearCartAction(): Promise<ActionResult<{ message: string }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const res = await api.clearCart(token);
  if (!res.ok) return failWith(res.error);
  revalidatePath("/cart");
  return ok({ message: res.data?.message ?? "Your cart is empty." });
}

/**
 * A guest's browser cart, sent once right after login or signup. Items that
 * can't be bought are skipped by the backend; it never fails over one item.
 * Returns the merged cart's lines so the badge updates without another call.
 */
export async function mergeGuestCartAction(items: unknown): Promise<ActionResult<{ message: string; cart: CartLines | null }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  const list = (Array.isArray(items) ? items : [])
    .filter((i): i is { listingId: string; quantity: number } => !!i && isUuidLike(i.listingId) && Number.isInteger(i.quantity) && i.quantity >= 1)
    .map((i) => ({ listingId: i.listingId, quantity: Math.min(i.quantity, MAX_QUANTITY) }))
    .slice(0, CART_ITEM_LIMIT);
  if (!list.length) return invalid("Nothing to add.");
  const res = await api.mergeCart(token, list);
  if (!res.ok) return failWith(res.error);
  revalidatePath("/cart");
  const fresh = await api.getCart(token);
  return ok({ message: res.data?.message ?? "Your cart is updated.", cart: fresh.ok ? linesOf(fresh.data) : null });
}
