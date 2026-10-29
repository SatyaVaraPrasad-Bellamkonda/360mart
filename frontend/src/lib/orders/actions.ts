"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/auth/actions";
import { isUuidLike } from "@/lib/inventory/validation";
import { cleanText, failWith, invalid, LOGIN_NEEDED, ok, sessionToken } from "./action-helpers";
import * as api from "./order-service";
import { NOTE_MAX, REASON_MAX, REASON_MIN, type CustomerOrder } from "./types";

// The shopper's checkout and orders. Checkout is all or nothing on the backend,
// and the idempotency key (made once per checkout visit in the browser) means a
// retry, double tap or lost connection never orders twice.

export async function placeOrderAction(input: { idempotencyKey: unknown; addressId: unknown; stores: unknown; expectedTotal: unknown }): Promise<ActionResult<{ message: string; ids: string[] }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(input.idempotencyKey)) return invalid("This page has expired. Please refresh and try again.");
  if (!isUuidLike(input.addressId)) return invalid("Choose a delivery address.", { addressId: "Choose a delivery address." });
  const stores = (Array.isArray(input.stores) ? input.stores : [])
    .filter((s): s is { storeId: string; note?: unknown } => !!s && isUuidLike(s.storeId))
    .map((s) => {
      const note = cleanText(s.note);
      return note ? { storeId: s.storeId, note } : { storeId: s.storeId, note: undefined as string | undefined };
    });
  if (stores.length < 1 || stores.length > 10 || new Set(stores.map((s) => s.storeId)).size !== stores.length) return invalid("Choose the stores to order from (up to 10).");
  const longNote = stores.find((s) => (s.note?.length ?? 0) > NOTE_MAX);
  if (longNote) return invalid(`Keep each note under ${NOTE_MAX} characters.`, { [`stores[${longNote.storeId}]`]: `Keep the note under ${NOTE_MAX} characters.` });
  const total = input.expectedTotal;
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) return invalid("Please refresh the page and try again.");

  const res = await api.checkout(token, { idempotencyKey: input.idempotencyKey, addressId: input.addressId, paymentMethod: "COD", stores, expectedTotal: Math.round(total * 100) / 100 });
  if (!res.ok) return failWith(res.error);
  revalidatePath("/cart");
  revalidatePath("/account", "layout");
  return ok({ message: res.data.message, ids: res.data.ids ?? [] });
}

/** The order page's refresh while the order is moving (polled every ~25 s). */
export async function loadOrderAction(orderId: unknown): Promise<ActionResult<CustomerOrder>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(orderId)) return invalid("Order not found.");
  const res = await api.getOrder(token, orderId);
  return res.ok ? ok(res.data) : failWith(res.error);
}

/** Cancel while the store hasn't accepted yet; returns the fresh order. */
export async function cancelOrderAction(orderId: unknown, reasonInput: unknown): Promise<ActionResult<{ message: string; order: CustomerOrder | null }>> {
  const token = await sessionToken();
  if (!token) return failWith(LOGIN_NEEDED);
  if (!isUuidLike(orderId)) return invalid("Order not found.");
  const reason = cleanText(reasonInput);
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) return invalid(`Tell us why in ${REASON_MIN} to ${REASON_MAX} characters.`, { reason: `Tell us why in ${REASON_MIN} to ${REASON_MAX} characters.` });
  const res = await api.cancelOrder(token, orderId, reason);
  if (!res.ok) return failWith(res.error);
  revalidatePath("/account", "layout");
  const fresh = await api.getOrder(token, orderId);
  return ok({ message: res.data.message, order: fresh.ok ? fresh.data : null });
}
